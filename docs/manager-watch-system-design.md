# Motherwell F.C. Manager-Watch & Research System — Implementation Plan

## Context

Greenfield project (repo `widget` contains only a README). Goal: a fully automated, deterministic (no AI APIs) system that (a) detects a **confirmed** Motherwell F.C. managerial appointment in near real-time, and (b) triggers a rule-based research pipeline producing a structured dossier (tactical profile, youth development record, career history) with claim-level evidence and confidence scoring. Output is both machine-readable JSON and a human-readable report.

---

## 1. System Overview

A single Python service (deployable as one Docker container + PostgreSQL) with five cooperating subsystems:

1. **Monitor** — polls a fixed roster of sources (official club site/RSS, BBC, Sky Sports, PA via BBC, Wikipedia revision API, club X/Twitter via RSS bridge) on tiered intervals.
2. **Trigger Engine** — applies regex/rule-based confirmation logic with a source-quorum model; transitions a state machine from `MONITORING → CANDIDATE → CONFIRMED → RESEARCHING → COMPLETE`.
3. **Research Orchestrator** — on confirmation, runs a DAG of deterministic extractors against Transfermarkt, Wikipedia, FBref, WorldFootball.net, Soccerway, and club archives.
4. **Evidence Engine** — every extracted fact becomes a `claim` linked to ≥1 `evidence` row (raw HTML snapshot + CSS/XPath locator); conflicts resolved by weighted source ranking.
5. **Output Generator** — renders JSON (validated against a JSON Schema) and a Markdown/HTML report with citations and per-section confidence scores.

Stack: **Python 3.12, PostgreSQL 16, httpx + BeautifulSoup/lxml, APScheduler, Jinja2, structlog**. No LLM/AI APIs anywhere — all extraction is HTML parsing, regex, and rule tables.

---

## 2. Architecture Breakdown

### Repository layout

```
widget/
├── pyproject.toml
├── docker-compose.yml          # app + postgres
├── alembic/                    # migrations
├── config/
│   ├── sources.yaml            # source registry: URLs, tier, poll interval, parser name
│   ├── patterns.yaml           # confirmation regexes, exclusion regexes
│   └── settings.py             # pydantic-settings (env-driven)
├── src/manager_watch/
│   ├── monitor/                # fetchers + per-source parsers
│   │   ├── fetcher.py          # httpx client, retries, conditional GET (ETag/Last-Modified)
│   │   ├── parsers/            # official_site.py, bbc.py, sky.py, wikipedia_rev.py, rss.py
│   │   └── dedup.py
│   ├── trigger/
│   │   ├── rules.py            # confirmation/exclusion pattern engine
│   │   ├── quorum.py           # source-quorum scoring
│   │   └── state_machine.py
│   ├── research/
│   │   ├── orchestrator.py     # DAG runner
│   │   ├── extractors/         # transfermarkt.py, wikipedia.py, fbref.py, worldfootball.py, soccerway.py, news_archive.py
│   │   ├── tactical.py         # formation/style derivation rules
│   │   ├── youth.py            # youth-usage computation
│   │   └── career.py
│   ├── evidence/
│   │   ├── ranking.py          # source scores
│   │   ├── claims.py           # claim creation + linking
│   │   └── conflicts.py
│   ├── db/                     # SQLAlchemy models + repositories
│   ├── output/
│   │   ├── json_builder.py
│   │   ├── report.py           # Jinja2 → Markdown/HTML
│   │   └── schema/dossier.schema.json
│   ├── scheduler.py            # APScheduler wiring
│   ├── alerts.py               # webhook/email notifications
│   └── cli.py                  # typer CLI: run, backfill, force-trigger, render
└── tests/
    ├── fixtures/html/          # saved real pages per source (parser regression tests)
    └── ...
```

### Components & responsibilities

| Component | Responsibility | Key implementation detail |
|---|---|---|
| **Scheduler** | Owns all timing. Tiered polling jobs, retry re-queues, research DAG kickoff, watchdog ("no successful poll in 30 min" alert). | APScheduler `AsyncIOScheduler`; jobs idempotent; jitter ±10% to avoid thundering herd. |
| **Monitor (Fetcher)** | HTTP GET with per-domain rate limits, conditional GET (ETag/If-Modified-Since), rotating realistic UA, 15s timeout. Stores every changed page as a `raw_documents` row (gzipped HTML + SHA-256). | httpx async client; per-domain semaphore (1 concurrent req/domain). |
| **Parsers** | One module per source type: extract `(headline, body_text, published_at, url)` items from listing pages/RSS/Wikipedia revision diffs. Pure functions: HTML in → list of `NewsItem` out. Each has fixture-based tests. | BeautifulSoup + lxml; RSS via `feedparser`. |
| **Dedup** | Drop already-seen items: SHA-256 of canonical URL + normalized headline (lowercased, punctuation stripped); 30-day seen-cache in `detection_events`. | Also fuzzy: token-sort-ratio ≥ 92 (`rapidfuzz`) against last 72h headlines → mark duplicate. |
| **Trigger Engine** | Classify each new item via pattern rules; score; advance state machine; create `detection_events`; on CONFIRMED, insert `appointments` row with unique constraint to prevent double-fire. | Detail in §3 and §6. |
| **Research Orchestrator** | Resolve manager identity → run extractor DAG with bounded concurrency → write claims/evidence → mark phase complete → call Output Generator. Resumable: each DAG node records status in `research_tasks`. | Plain asyncio task graph; no Celery needed at this scale. |
| **Extractors** | One per target site. Fetch, snapshot raw, parse to typed records (matches, stints, quotes), emit claims. | Detail in §5. |
| **Evidence Engine** | Source scoring, claim↔evidence linking, conflict resolution, confidence computation. | Detail in §6. |
| **DB layer** | SQLAlchemy 2.0 models, Alembic migrations, repository classes. Raw HTML in `raw_documents` (bytea, gzip); processed data in normalized tables. | |
| **Output Generator** | Build dossier JSON (validate with `jsonschema`), render Markdown report via Jinja2, write both to `reports` table + `output/` dir, fire alert webhook. | |
| **Alerts** | Webhook (Slack/Discord-compatible JSON POST) + optional SMTP on: CANDIDATE detected, CONFIRMED, research complete, system errors. | |

---

## 3. Data Flow (step-by-step)

### Monitoring sources (exact registry, `config/sources.yaml`)

| # | Source | Type | URL/endpoint | Tier (weight) | Poll interval | Why this interval |
|---|---|---|---|---|---|---|
| 1 | Motherwell FC official news | HTML listing | `https://www.motherwellfc.co.uk/news/` | OFFICIAL (1.0) | **5 min** | Official announcement is the ground truth; 5 min keeps latency low without abusing a club CMS. |
| 2 | Motherwell FC RSS (if present) | RSS | `https://www.motherwellfc.co.uk/feed/` | OFFICIAL (1.0) | 5 min | Cheap conditional GET; same tier as #1. |
| 3 | BBC Sport Motherwell | HTML listing | `https://www.bbc.co.uk/sport/football/teams/motherwell` | TIER1 (0.9) | **5 min** | BBC often publishes within minutes of, or before, the club. |
| 4 | Sky Sports Motherwell | HTML listing | `https://www.skysports.com/motherwell-news` | TIER1 (0.85) | 10 min | Frequently first with "set to appoint" — good CANDIDATE signal. |
| 5 | Wikipedia revisions: `Motherwell F.C.` + `List of Motherwell F.C. managers` | MediaWiki API `action=query&prop=revisions` | `en.wikipedia.org/w/api.php` | TIER2 (0.6) | 15 min | Edited fast by fans but vandalism-prone → corroboration only, never sole trigger. |
| 6 | Club official X/Twitter `@MotherwellFC` | RSS bridge (self-hosted RSSHub/Nitter instance) | configured per deployment | OFFICIAL (1.0) | 5 min | Clubs usually tweet simultaneously with site post; bridge avoids paid X API. Marked **optional/degradable** — bridges break. |
| 7 | The Herald / Daily Record Motherwell tag pages | HTML listing | `heraldscotland.com`, `dailyrecord.co.uk` tag URLs | TIER2 (0.7) | 15 min | Scottish press corroboration. |
| 8 | Google News RSS query | RSS | `https://news.google.com/rss/search?q="Motherwell"+manager` | TIER2 (0.6, attributes to underlying publisher) | 10 min | Wide net; publisher extracted from item and re-ranked by that publisher's tier. |

Interval rationale: official + BBC at 5 min bounds worst-case detection latency to ~5 min for the trigger-critical sources; lower-trust corroboration sources at 10–15 min since they never fire alone. All fetches use conditional GET so steady-state cost is tiny.

### Step-by-step flow

1. **Detection.** Scheduler fires per-source poll → Fetcher GETs (conditional) → unchanged ⇒ stop; changed ⇒ snapshot to `raw_documents`, Parser yields `NewsItem`s → Dedup filters → surviving items written to `detection_events(status='NEW')`.
2. **Validation (rule engine).** Each item scored against `patterns.yaml`:
   - **Confirmation patterns** (case-insensitive regex on headline+lede; all require the string `motherwell` within the same item):
     `\b(appoints?|appointed|named|unveil(s|ed)?|confirm(s|ed)?)\b.{0,60}\b(as\s+)?(new\s+)?(manager|head coach|boss)\b`, plus reversed-order variant, plus `\bnew (manager|head coach) of motherwell\b`.
   - **Exclusion patterns** (any match ⇒ classify SPECULATION, never CANDIDATE): `\b(linked|favourite|frontrunner|front-runner|in talks|shortlist|target|odds|set to|close to|expected to|poised|interview(ed)?|approach(ed)?|candidate|rumour|reports? (claim|suggest))\b`, `\?$` on headline.
   - **Interim flag** (does not block, sets `is_interim=true`): `\b(interim|caretaker|temporary)\b`.
   - **Name extraction:** deterministic — capitalized token sequence (2–4 tokens, `[A-Z][\w''-]+`) within 8 tokens of the appointment verb; validated against a non-name stoplist (club names, "Fir Park", weekdays); normalized (NFKD, lowercase, diacritics stripped) into `canonical_name`.
3. **Trigger (quorum).** Per candidate name, sum tier weights of distinct *publishers* with a confirmation-pattern hit in a rolling 6h window. **CONFIRMED iff**: (a) any OFFICIAL source matches (weight 1.0 alone suffices), **or** (b) Σweights ≥ 1.5 from ≥2 distinct TIER1/TIER2 publishers (e.g. BBC 0.9 + Sky 0.85). Wikipedia alone or Google News alone can never confirm. On CONFIRMED: `INSERT INTO appointments (manager_id, club_id, announced_at, …)` guarded by partial unique index `(club_id) WHERE status='ACTIVE'` + unique `(manager_id, club_id, announced_at::date)` — a second confirmation for the same person/club hits the constraint and is recorded as corroborating evidence instead (this is the duplicate-run guard). State machine row in `watch_state` advances `MONITORING→CONFIRMED`; CANDIDATE state (single TIER1 hit) raises a heads-up alert and tightens official-site polling to 2 min.
4. **Data collection.** Orchestrator resolves identity (search Transfermarkt + Wikipedia for canonical_name; require birth-date or current-club agreement between two sources to bind IDs), then runs extractor DAG: `identity → {career, matches} → {tactical, youth} → news_archive`, snapshotting every fetched page.
5. **Processing.** Extractors emit typed records into `clubs`, `manager_stints`, `matches`; derivation modules (`tactical.py`, `youth.py`, `career.py`) compute aggregates; every output fact is written as a `claims` row linked to `evidence` rows; Conflict resolver reconciles disagreeing claims (§6).
6. **Output generation.** JSON dossier built from resolved claims, validated against `dossier.schema.json`; Markdown report rendered with citations + confidence; both stored in `reports` and written to disk; completion webhook fired; state → `COMPLETE`, monitoring continues for the next cycle.

### Failure handling & retries (monitoring)

- Per-fetch: 3 retries, exponential backoff 2s/4s/8s + jitter, on timeout/5xx/connection errors. 4xx ⇒ no retry, log + count.
- Per-source circuit breaker: 5 consecutive failures ⇒ source marked `DEGRADED`, polling backed off to 4× interval, alert fired; auto-half-open probe each hour.
- System never blocks on one source: quorum is designed so any single source outage still allows confirmation via the others.
- Watchdog job: if zero successful polls across all OFFICIAL+TIER1 sources in 30 min ⇒ critical alert (likely network/IP block).
- All raw snapshots are kept, so a parser bug can be fixed and replayed (`cli backfill --from <ts>`).

---

## 4. Data Schema (PostgreSQL — detailed)

**Choice: PostgreSQL (SQL).** Justification: the core of this system is *relationships* — claims↔evidence↔sources, managers↔stints↔clubs↔matches — with hard integrity needs (unique active appointment, FK-enforced evidence links) and quorum/conflict queries that are natural joins/aggregations. JSONB gives schemaless storage where useful (raw payloads, dossier JSON) without giving up constraints. NoSQL would force app-level enforcement of exactly the guarantees (dedup, no-duplicate-trigger) the spec demands.

Conventions: `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` on every table (omitted below for brevity).

```sql
-- 1. sources: registry of monitored/scraped origins
CREATE TABLE sources (
  id           BIGINT PK,
  name         TEXT NOT NULL UNIQUE,          -- 'Motherwell FC Official'
  publisher    TEXT NOT NULL,                 -- 'motherwellfc.co.uk' (quorum counts distinct publishers)
  url          TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('html','rss','api','social')),
  tier         TEXT NOT NULL CHECK (tier IN ('OFFICIAL','TIER1','TIER2','TIER3')),
  weight       NUMERIC(3,2) NOT NULL,         -- 1.00, 0.90, 0.85, ...
  poll_seconds INT,                           -- NULL for research-only sources
  status       TEXT NOT NULL DEFAULT 'ACTIVE' -- ACTIVE|DEGRADED|DISABLED
);
-- Example: (1,'Motherwell FC Official','motherwellfc.co.uk','https://www.motherwellfc.co.uk/news/','html','OFFICIAL',1.00,300,'ACTIVE')

-- 2. raw_documents: immutable snapshots of every fetched page (raw layer)
CREATE TABLE raw_documents (
  id           BIGINT PK,
  source_id    BIGINT NOT NULL REFERENCES sources(id),
  url          TEXT NOT NULL,
  fetched_at   TIMESTAMPTZ NOT NULL,
  http_status  INT NOT NULL,
  content_sha256 CHAR(64) NOT NULL,
  content_gz   BYTEA NOT NULL,                -- gzipped body
  UNIQUE (source_id, url, content_sha256)     -- dedup identical snapshots
);

-- 3. detection_events: every parsed news item + its classification
CREATE TABLE detection_events (
  id           BIGINT PK,
  source_id    BIGINT NOT NULL REFERENCES sources(id),
  raw_document_id BIGINT NOT NULL REFERENCES raw_documents(id),
  url          TEXT NOT NULL,
  headline     TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  dedup_hash   CHAR(64) NOT NULL UNIQUE,      -- sha256(canonical_url + norm_headline)
  classification TEXT NOT NULL CHECK (classification IN
    ('IRRELEVANT','SPECULATION','CANDIDATE','CONFIRMATION','DUPLICATE')),
  extracted_name TEXT,                        -- normalized candidate manager name
  is_interim   BOOLEAN NOT NULL DEFAULT FALSE,
  matched_patterns TEXT[]                     -- which regex ids fired (audit)
);
-- Example: (88,3,412,'https://www.bbc.co.uk/sport/football/c123','Motherwell appoint Jane Doe as new manager',
--           '2026-06-11T09:02:00Z','ab12...','CONFIRMATION','jane doe',false,'{appoint_v1}')

-- 4. managers
CREATE TABLE managers (
  id           BIGINT PK,
  canonical_name TEXT NOT NULL,
  full_name    TEXT,
  birth_date   DATE,
  nationality  TEXT,
  transfermarkt_id TEXT UNIQUE,
  wikipedia_title  TEXT UNIQUE,
  fbref_id     TEXT UNIQUE,
  UNIQUE (canonical_name, birth_date)
);
-- Example: (7,'jane doe','Jane Doe','1975-03-14','Scotland','12345','Jane_Doe_(footballer)','a1b2c3')

-- 5. clubs
CREATE TABLE clubs (
  id BIGINT PK, name TEXT NOT NULL, country TEXT, league TEXT,
  transfermarkt_id TEXT UNIQUE, UNIQUE (name, country)
);
-- Example: (1,'Motherwell','Scotland','Scottish Premiership','956')

-- 6. manager_stints: a manager's tenure at a club (career history backbone)
CREATE TABLE manager_stints (
  id BIGINT PK,
  manager_id BIGINT NOT NULL REFERENCES managers(id),
  club_id    BIGINT NOT NULL REFERENCES clubs(id),
  role       TEXT NOT NULL DEFAULT 'manager',  -- manager|head coach|interim|assistant|youth coach
  start_date DATE, end_date DATE,              -- NULL end = current
  matches INT, wins INT, draws INT, losses INT,
  points_per_game NUMERIC(4,2),
  honours    JSONB,                            -- [{"name":"League One title","season":"2021-22"}]
  UNIQUE (manager_id, club_id, start_date)
);
-- Example: (31,7,14,'manager','2021-06-01','2024-05-30',128,61,30,37,1.65,
--           '[{"name":"Promotion to Championship","season":"2022-23"}]')

-- 7. matches: match-level evidence for tactical/youth analysis
CREATE TABLE matches (
  id BIGINT PK,
  stint_id   BIGINT NOT NULL REFERENCES manager_stints(id),
  match_date DATE NOT NULL,
  competition TEXT, opponent TEXT, home BOOLEAN,
  goals_for INT, goals_against INT,
  formation  TEXT,                             -- '4-3-3' as listed by source
  lineup     JSONB,                            -- [{"name":"...","age_on_date":17.9,"academy":true,"minutes":90}]
  source_url TEXT NOT NULL,
  raw_document_id BIGINT REFERENCES raw_documents(id),
  UNIQUE (stint_id, match_date, opponent)
);
-- Example: (5012,31,'2023-10-07','Championship','Dundee Utd',true,2,1,'4-2-3-1',
--           '[{"name":"A. Smith","age_on_date":18.2,"academy":true,"minutes":74}]',
--           'https://www.worldfootball.net/...',9981)

-- 8. appointments: confirmed trigger record (duplicate-run guard lives here)
CREATE TABLE appointments (
  id BIGINT PK,
  manager_id BIGINT NOT NULL REFERENCES managers(id),
  club_id    BIGINT NOT NULL REFERENCES clubs(id),
  announced_at TIMESTAMPTZ NOT NULL,
  is_interim BOOLEAN NOT NULL DEFAULT FALSE,
  confirmation_score NUMERIC(4,2) NOT NULL,    -- summed quorum weight at trigger time
  status TEXT NOT NULL DEFAULT 'ACTIVE',       -- ACTIVE|SUPERSEDED|RETRACTED
  research_state TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (research_state IN ('PENDING','RUNNING','COMPLETE','FAILED')),
  UNIQUE (manager_id, club_id, (announced_at::date))
);
CREATE UNIQUE INDEX one_active_per_club ON appointments(club_id) WHERE status='ACTIVE';

-- 9. claims: atomic structured facts produced by research
CREATE TABLE claims (
  id BIGINT PK,
  appointment_id BIGINT NOT NULL REFERENCES appointments(id),
  manager_id BIGINT NOT NULL REFERENCES managers(id),
  category  TEXT NOT NULL CHECK (category IN ('tactical','youth','career','biographical')),
  predicate TEXT NOT NULL,                     -- machine key: 'primary_formation','youth_debut_count',...
  value     JSONB NOT NULL,                    -- {"formation":"4-3-3","share":0.62}
  confidence NUMERIC(3,2) NOT NULL,            -- 0.00–1.00, computed (§6)
  status    TEXT NOT NULL DEFAULT 'ACCEPTED'   -- ACCEPTED|DISPUTED|REJECTED
);
-- Example: (901,4,7,'tactical','primary_formation',
--           '{"formation":"4-3-3","share":0.62,"sample_matches":120}',0.86,'ACCEPTED')

-- 10. evidence: links every claim to raw snapshots (claim→evidence model)
CREATE TABLE evidence (
  id BIGINT PK,
  claim_id  BIGINT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  source_id BIGINT NOT NULL REFERENCES sources(id),
  raw_document_id BIGINT NOT NULL REFERENCES raw_documents(id),
  url       TEXT NOT NULL,
  locator   TEXT,                              -- CSS/XPath or regex used: 'table#matchlogs tr[12] td.formation'
  excerpt   TEXT,                              -- exact quoted text supporting the claim
  retrieved_at TIMESTAMPTZ NOT NULL
);
-- Example: (2201,901,9,15011,'https://www.transfermarkt.com/.../jane-doe',
--           'table.items tr td:nth-child(5)','4-3-3 (62%)','2026-06-11T09:40:11Z')

-- 11. research_tasks: orchestrator DAG bookkeeping (resumability)
CREATE TABLE research_tasks (
  id BIGINT PK,
  appointment_id BIGINT NOT NULL REFERENCES appointments(id),
  task_name TEXT NOT NULL,                     -- 'extract_transfermarkt', 'derive_tactical', ...
  status TEXT NOT NULL DEFAULT 'PENDING',      -- PENDING|RUNNING|DONE|FAILED
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  UNIQUE (appointment_id, task_name)
);

-- 12. reports: final outputs
CREATE TABLE reports (
  id BIGINT PK,
  appointment_id BIGINT NOT NULL REFERENCES appointments(id) UNIQUE,
  dossier_json JSONB NOT NULL,
  report_markdown TEXT NOT NULL,
  overall_confidence NUMERIC(3,2) NOT NULL
);

-- 13. watch_state: singleton-per-club state machine
CREATE TABLE watch_state (
  club_id BIGINT PRIMARY KEY REFERENCES clubs(id),
  state TEXT NOT NULL DEFAULT 'MONITORING',    -- MONITORING|CANDIDATE|CONFIRMED|RESEARCHING|COMPLETE
  candidate_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL
);
```

Relationships: `sources 1—* raw_documents 1—* detection_events`; `managers 1—* manager_stints *—1 clubs`; `manager_stints 1—* matches`; `appointments 1—* claims 1—* evidence`; `appointments 1—1 reports`.

---

## 5. Research Pipeline Design (deterministic, no AI APIs)

### Identity resolution (first DAG node)
- Query Transfermarkt quick-search (`/schnellsuche/ergebnis/schnellsuche?query=<name>`) and Wikipedia search API for `extracted_name`.
- Bind IDs only if two independent sources agree on (normalized name AND (birth_date OR most-recent club)). Disagreement ⇒ task FAILED with `IDENTITY_AMBIGUOUS`, alert fired for human resolution via `cli force-trigger --manager-id` — never guess.

### Extraction targets & techniques

| Target | What | How (deterministic) |
|---|---|---|
| **Transfermarkt manager profile** (`/profil/trainer/<id>`) + “Stations/History” tab | Career stints: club, role, dates, matches, W/D/L, PPG | lxml: locate `table.items`; map columns by header text (not position); dates via `dateutil` with explicit `dd.mm.yyyy` format; numbers via `int()` after thousands-separator strip. |
| **Transfermarkt “preferred formation”** on profile + per-season club pages | Formation per stint/season | Read labeled field `li:has(span:contains("Preferred formation"))`; cross-check against match-level data below. |
| **Wikipedia manager article** | Infobox (birth date, nationality, managerial career table), honours section | `mwparserfromhell` on wikitext via API (stable vs HTML scraping); infobox params `birth_date`, `managerclubs`/`manageryears`; honours = list items under `== Honours ==` heading parsed with regex `^(?P<title>.+?)(?::|–)\s*(?P<seasons>.+)$`. |
| **WorldFootball.net / Soccerway club match pages** for each stint’s seasons | Per-match: date, opponent, score, lineup, formation | Static HTML tables; header-mapped column extraction; lineups from match-detail pages (`table.standard_tabelle` rows with player links + age from player pages, cached in a local `players` lookup). |
| **FBref manager/squad season pages** (where available) | Squad minutes by age, possession %, shots, pressing proxies (for style) | Tables are in HTML comments on FBref — strip `<!-- -->` then parse; `pandas.read_html` on the cleaned fragment; join on player name+birth-year. |
| **Club official-site news archives + BBC archive** (site search URLs with manager name) | Quotes/interviews for style & youth philosophy; case-study material | Fetch result pages; keep paragraphs matching keyword rule-sets (below); store as quote evidence, never as standalone facts. |

### Raw → structured insight (derivation rules)

**Tactical profile (`tactical.py`)** — input: `matches` rows for last N≤150 matches across recent stints.
- `primary_formation`: modal formation; emit `{formation, share, sample_matches}`. Secondary formations with share ≥ 0.15 also emitted. Confidence scales with sample size (`min(1, n/50)` factor).
- `formation_by_stint`: same per stint (detects evolution).
- `playing_style`: **rule table on numeric aggregates only** (no NLP guessing):
  - `attacking_output` = GF/match vs league median for those seasons → labels `high/medium/low scoring`.
  - `defensive_solidity` = GA/match vs league median.
  - `possession_oriented` = TRUE if FBref possession ≥ 52% over sample (emitted only when FBref data exists).
  - `direct_play` proxy = (long-pass share ≥ 12% if available) else omitted — rules never invent labels without the underlying metric; missing metric ⇒ claim not emitted.
- `style_quotes`: paragraphs from interviews matching `\b(press|pressing|possession|direct|counter|build.?up|front foot|aggressive|compact)\b` stored as supporting quotes with `confidence ≤ 0.5` (subjective evidence cap).
- `match_evidence`: 5 exemplar matches (highest/lowest scoring, formation-change games) linked as evidence.

**Youth development (`youth.py`)** — input: `matches.lineup` JSONB + player birth dates.
- `u21_minutes_share` = Σ minutes by players <21 on match date ÷ Σ all minutes, per stint. League-context note attached when comparable league averages are loadable from FBref.
- `debuts_u21` = count of players whose first senior appearance (first occurrence in club match data) happened under this manager while <21.
- `academy_involvement`: boolean per player from club-site academy/“through the ranks” keyword match (`\b(academy graduate|youth product|came through the (ranks|academy))\b`) in club articles; conservative — only flag on explicit match.
- `case_studies`: top 3 players by U21 minutes under the manager → record `{player, debut_date, minutes, subsequent_transfer_or_caps_if_on_transfermarkt}` each with evidence links.

**Career history (`career.py`)**
- Merge Transfermarkt stints with Wikipedia managerial-career table (conflict rules §6).
- Per stint: PPG, win %, tenure days; `achievements` from honours parsing; `failures` rule: relegation in final season of stint, or sacked with PPG < 1.0 (departure reason regex on news archive: `\b(sacked|dismissed|relieved of|parted company|mutual consent|resigned)\b`).
- `trajectory`: ordered tier of leagues managed (static league-tier lookup table in `config/`).

Every derived value is written as a `claims` row whose `evidence` rows point at the exact snapshot + locator + excerpt used.

### Politeness & legality guardrails
- Respect robots.txt (checked at startup per domain; violations disable the extractor with an alert), per-domain delay ≥ 3 s for research targets, identifying User-Agent string with contact email, full raw caching so each page is fetched once per run.

---

## 6. Evidence & Verification Model

**Source ranking (scoring logic).** `score(source) = tier_weight × recency_factor × specificity_factor`
- `tier_weight`: OFFICIAL 1.0 · TIER1 (BBC 0.90, Sky 0.85, PA 0.85) · TIER2 (national press 0.70, Wikipedia 0.60, Google-News-proxied 0.60) · TIER3 (blogs/fan sites — research quotes only, 0.40).
- `recency_factor`: 1.0 if document ≤ 2 years old, −0.05 per additional year, floor 0.7 (career facts don’t decay much; the factor mainly demotes stale tactical claims).
- `specificity_factor`: 1.0 for primary data tables (Transfermarkt match logs), 0.9 for secondary summaries, 0.6 for journalistic characterization, 0.4 for quotes/opinion.

**Claim → evidence linking.** No claim exists without ≥1 evidence row carrying `(raw_document_id, locator, excerpt)`. Claim confidence = `min(0.99, base × corroboration)` where `base` = max evidence score and `corroboration` = `1 + 0.15 × (distinct_publishers − 1)`, and statistical claims additionally multiply the sample-size factor from §5.

**Conflict resolution (deterministic order):**
1. Same predicate, compatible values (dates within 7 days; numbers within 5%) ⇒ merge, keep highest-score source’s value, attach all evidence.
2. Incompatible ⇒ keep claim from higher total evidence score; loser stored with `status='DISPUTED'` (never deleted — reports list disputes ≥ 0.5 score in a “Conflicting evidence” note).
3. Tie within 0.05 ⇒ both `DISPUTED`, claim excluded from headline facts, surfaced in report’s caveats.
4. OFFICIAL source always beats non-official for biographical/appointment facts regardless of arithmetic.

**Raw vs processed storage.** Raw = `raw_documents` (immutable, gzipped, hash-deduped, 2-year retention). Processed = normalized tables (`claims`, `matches`, `manager_stints`, …) always regenerable from raw via `cli backfill`. Reports pin to claim IDs so a re-run produces a new report version rather than mutating history.

---

## 7. Output Formats

### Machine-readable: `dossier.schema.json` (excerpted example instance)

```json
{
  "schema_version": "1.0",
  "appointment": {
    "club": "Motherwell",
    "manager": {"canonical_name": "jane doe", "full_name": "Jane Doe",
                 "birth_date": "1975-03-14", "nationality": "Scotland"},
    "announced_at": "2026-06-11T09:02:00Z",
    "is_interim": false,
    "confirmation": {
      "score": 1.90,
      "confirming_sources": [
        {"publisher": "motherwellfc.co.uk", "url": "https://...", "tier": "OFFICIAL"},
        {"publisher": "bbc.co.uk", "url": "https://...", "tier": "TIER1"}
      ]
    }
  },
  "tactical_profile": {
    "primary_formation": {"value": "4-3-3", "share": 0.62, "sample_matches": 120,
      "confidence": 0.86, "evidence_ids": [2201, 2202]},
    "secondary_formations": [{"value": "4-2-3-1", "share": 0.21, "confidence": 0.81, "evidence_ids": [2203]}],
    "style_indicators": [
      {"predicate": "attacking_output", "value": "high", "metric": {"gf_per_match": 1.71, "league_median": 1.38},
       "confidence": 0.78, "evidence_ids": [2210]}
    ],
    "exemplar_matches": [{"date": "2023-10-07", "opponent": "Dundee Utd", "score": "2-1",
                            "formation": "4-2-3-1", "evidence_ids": [2215]}]
  },
  "youth_development": {
    "u21_minutes_share": {"value": 0.14, "stints": [{"club": "Example FC", "value": 0.17}],
                           "confidence": 0.74, "evidence_ids": [2301]},
    "debuts_u21": {"value": 9, "confidence": 0.7, "evidence_ids": [2302]},
    "case_studies": [{"player": "A. Smith", "debut_date": "2022-08-13", "minutes_under_manager": 3120,
                       "academy_graduate": true, "confidence": 0.66, "evidence_ids": [2305, 2306]}]
  },
  "career_history": {
    "stints": [{"club": "Example FC", "role": "manager", "start": "2021-06-01", "end": "2024-05-30",
                 "record": {"P": 128, "W": 61, "D": 30, "L": 37, "ppg": 1.65},
                 "honours": [{"name": "Promotion to Championship", "season": "2022-23"}],
                 "departure": "resigned", "confidence": 0.92, "evidence_ids": [2401, 2402]}]
  },
  "disputed_claims": [{"predicate": "stint_start", "values": ["2021-06-01", "2021-07-01"],
                        "evidence_ids": [2401, 2410]}],
  "overall_confidence": 0.81,
  "generated_at": "2026-06-11T10:15:00Z"
}
```

The full JSON Schema (types, required fields, `confidence` bounded 0–1, `evidence_ids` arrays of integers) ships at `src/manager_watch/output/schema/dossier.schema.json` and every dossier is validated before storage.

### Human-readable: Markdown report template (`report.md.j2`)

```markdown
# Manager Dossier: Jane Doe — Motherwell F.C.
Confirmed 2026-06-11 09:02 UTC · Overall confidence: 0.81 (High)

## 1. Appointment
Confirmed by motherwellfc.co.uk [E1] and BBC Sport [E2]. Permanent role.

## 2. Tactical Profile  (confidence: 0.84)
- **Primary formation: 4-3-3** — used in 62% of 120 sampled matches [E3][E4]
- Attacking output: high (1.71 GF/match vs league median 1.38) [E5]
> "We want to be on the front foot…" — Jane Doe, BBC interview, 2023 [E6] *(quote — supporting only)*

## 3. Youth Development  (confidence: 0.70)
…

## 4. Career History  (confidence: 0.92)
| Club | Role | Period | P-W-D-L | PPG | Notes |
|---|---|---|---|---|---|
…

## Conflicting evidence
- Stint start at Example FC: Transfermarkt says 2021-06-01 [E12]; Wikipedia says 2021-07-01 [E13]. Transfermarkt retained (higher source score).

## Evidence Index
[E1] motherwellfc.co.uk — "Motherwell appoint Jane Doe" — retrieved 2026-06-11T09:05Z — <url>
…
```

Confidence bands shown in headings: High ≥ 0.75, Medium 0.5–0.75, Low < 0.5.

---

## 8. Tech Stack (justified)

| Layer | Choice | Why |
|---|---|---|
| Language | **Python 3.12** | Best scraping/parsing ecosystem; async HTTP; team-agnostic readability; pandas for table-heavy FBref pages. |
| HTTP | **httpx** (async) + **tenacity** (retries) | Async fan-out across sources; first-class timeout control; tenacity gives declarative backoff matching §3 policy. |
| Parsing | **BeautifulSoup4 + lxml**, **feedparser**, **mwparserfromhell**, **pandas.read_html** | lxml speed + BS4 ergonomics for messy HTML; feedparser handles RSS edge cases; mwparserfromhell parses Wikipedia wikitext deterministically (far stabler than scraping rendered HTML); pandas for FBref comment-wrapped tables. |
| Rule matching | **regex** stdlib + **rapidfuzz** | All confirmation/style/exclusion logic is regex tables in YAML (auditable, testable). rapidfuzz for fuzzy headline dedup — deterministic string algorithms, not ML. |
| Scheduler | **APScheduler** | In-process cron-like tiers with jitter; no broker to operate. Single club ⇒ Celery is overkill (revisit at multi-league scale). |
| DB | **PostgreSQL 16 + SQLAlchemy 2.0 + Alembic** | §4 justification; Alembic for schema evolution. |
| Templating | **Jinja2** | Standard, logic-light report rendering. |
| Validation | **jsonschema**, **pydantic-settings** | Dossier contract enforcement; typed env config. |
| Logging | **structlog** (JSON logs) | Machine-parseable logs keyed by `source_id`/`appointment_id` for the watchdog and debugging. |
| CLI | **typer** | `run` / `backfill` / `force-trigger` / `render` operator commands. |
| Packaging | **Docker + docker-compose** | One-command deploy of app+DB on any VPS. |
| Tests | **pytest + fixture HTML files + respx** (httpx mocking) | Parser regression tests against saved real pages — the main defence against silent site-layout changes. |

Explicitly **not** used: Selenium/Playwright (all listed targets are server-rendered; keep a Playwright fallback note for the X/Twitter bridge only), Scrapy (framework weight not justified for a fixed source roster), any LLM/AI API (hard constraint).

---

## 9. Risks & Limitations

1. **Site layout changes** silently break parsers → mitigated by header-text-based column mapping, fixture tests, and a per-extractor canary check (`expected ≥ N rows else alert`), plus full raw snapshots for replay.
2. **Scraping ToS / blocking** (Transfermarkt and FBref rate-limit aggressively) → robots.txt compliance, ≥3 s delays, caching; residual risk: IP block ⇒ extractor DEGRADED, dossier ships with reduced confidence and missing-section notes rather than failing.
3. **X/Twitter access fragility** → bridge is optional by design; quorum works without it.
4. **Name ambiguity / identity errors** (two managers with same name) → two-source identity binding with hard-fail to human review; never auto-guess.
5. **False positives from speculation** → exclusion regexes + quorum; residual: a TIER1 outlet wrongly reporting as fact — mitigated because two independent publishers or the club itself are required; `RETRACTED` status path exists for rollback.
6. **Deterministic style labels are coarse** — without AI, “playing style” is bounded to metric-backed labels + quoted evidence; the system deliberately omits claims when metrics are missing rather than inferring.
7. **Lower-league data gaps** (FBref/Soccerway coverage thins below 2nd tiers) → confidence scoring already degrades with sample size; report flags data-poor stints.
8. **Single-process availability** — a crash pauses monitoring → systemd/Docker restart policy + watchdog alert; state machine + idempotent jobs make restarts safe.

---

## 10. Future Enhancements

1. **Multi-club/league scale-out**: `sources` and `watch_state` are already club-keyed; add a `clubs.watched` flag, move scheduler jobs to per-club configs, swap APScheduler for Celery + Redis when concurrent research runs > ~5, and shard fetchers by domain to respect rate limits globally.
2. Local (non-API) NLP upgrade: spaCy rule-based `Matcher`/`EntityRuler` for name extraction — still deterministic, better recall than pure regex.
3. Playwright fallback fetcher for JS-rendered sources.
4. Web dashboard (FastAPI + the existing tables) for live watch state, dispute review UI, and report browsing.
5. Retraction/correction monitor: re-poll confirming articles for 48h post-trigger; headline change matching `\b(deny|denies|u-turn|off)\b` flags the appointment for review.
6. Historical backtesting harness: replay archived snapshots of past appointment cycles (e.g. previous Motherwell hires) to tune quorum weights and regex precision/recall.

---

## Verification (how the built system will be tested)

1. **Parser fixtures**: save current real HTML of every source/extractor target into `tests/fixtures/html/`; pytest asserts exact extraction outputs.
2. **Trigger simulation**: feed synthetic `detection_events` (official-only, two-TIER1, speculation-only, Wikipedia-only) and assert state-machine transitions and the duplicate-trigger unique-constraint behavior.
3. **End-to-end dry run**: `cli force-trigger --name "<current Motherwell manager>"` against live sites in a staging DB; confirm dossier JSON validates against the schema and the Markdown report renders with working evidence links.
4. **Soak test**: run the monitor 48h; verify conditional-GET hit rate, zero unhandled exceptions in structlog output, watchdog silence.

## Build order (for the implementing developer)

1. Scaffold repo, Docker, Postgres, Alembic schema (§4) — *all tables up front*.
2. Fetcher + dedup + two parsers (official site, BBC) + scheduler → monitoring loop running.
3. Trigger engine + state machine + alerts (testable via simulation before research exists).
4. Remaining monitor parsers (Sky, Wikipedia revisions, Google News RSS, Herald/Record, X bridge).
5. Identity resolution + Transfermarkt/Wikipedia extractors + career derivation.
6. Match-level extractors (WorldFootball/Soccerway/FBref) + tactical & youth derivations.
7. Evidence engine (ranking, conflicts, confidence).
8. Output generator (JSON schema + Jinja2 report) + end-to-end dry run.
