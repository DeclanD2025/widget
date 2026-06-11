# Handoff — implementation status

Built against `docs/manager-watch-system-design.md`. All 65 tests pass
offline (`.venv/bin/python -m pytest`). Nothing has been run against live
sites yet.

## Done (build-order steps 1–3, 5 partial, 7, 8)

| Area | Status |
|---|---|
| Scaffold: pyproject, Dockerfile, docker-compose (app + Postgres 16), Alembic env | ✅ |
| Full schema (13 tables, design §4) as SQLAlchemy models with SQLite test variant; partial unique index `one_active_per_club`; per-day appointment dedup via stored `announced_on` | ✅ |
| Fetcher: conditional GET, tenacity retries (2s/4s/8s), per-domain throttle | ✅ |
| Monitor parsers: official site, BBC, Sky, newspaper tag pages, RSS (incl. Google News publisher re-attribution), Wikipedia revisions API | ✅ fixture-tested |
| Dedup: canonical-URL+headline hash, rapidfuzz fuzzy (≥92) | ✅ |
| Trigger engine: confirmation/exclusion regex tables (`config/patterns.yaml`), deterministic name extraction with stoplist, interim flag | ✅ |
| Quorum: official-alone OR ≥2 publishers ≥1.5; candidate alerting | ✅ |
| State machine (MONITORING→…→COMPLETE) with transition guards | ✅ |
| Poll cycle glue (`monitor/service.py`): snapshot→parse→dedup→classify→quorum→appointment row (+supersede previous ACTIVE) | ✅ unit-level only |
| Scheduler: APScheduler jobs per source with jitter, watchdog, crash-resume of pending research | ✅ untested live |
| Extractors: Transfermarkt (search, stations table, preferred formation), Wikipedia (infobox, honours, career years) — header-mapped, fixture-tested. WorldFootball season/lineup parsers written, untested against live HTML | ✅ / ⚠️ |
| Derivations: tactical (formations, style bands, exemplars), youth (U21 share, debuts, case studies), career (PPG, failure rule, trajectory) | ✅ |
| Evidence: ranking/confidence formulas, 4-rule conflict resolution | ✅ |
| Output: JSON schema + validated dossier builder, Jinja2 Markdown report, reports table + `output/` files | ✅ end-to-end tested (SQLite) |
| Orchestrator: resumable DAG with `research_tasks` bookkeeping, degrade-vs-fatal failure modes, claim/evidence persistence | ✅ |
| CLI: `init-db`, `run`, `classify`, `force-trigger`, `render` | ✅ |

## TODO (in priority order)

1. **Live-fixture pass** — fetch the real pages for every monitor source and
   extractor target, save into `tests/fixtures/html/`, and adjust selectors.
   Current fixtures are synthetic approximations of each site's markup; this
   is the main risk item. (`monitor/parsers/*.py`, `research/extractors/*.py`)
2. **`ResearchRun.matches`** (`research/orchestrator.py`) — resolve each
   stint's club to worldfootball.net season URLs and populate
   `matches_by_club` using `worldfootball.parse_season_matches` /
   `parse_match_lineup`; join player ages from cached player pages
   (`age_on_date` is currently left None, which silently disables youth
   claims). Derivations already consume the data once present.
3. **FBref extractor** (`research/extractors/fbref.py`) — currently raises
   `ExtractorUnavailable` (pipeline degrades gracefully). Implement comment-
   stripped table parsing for possession %/squad minutes; consider adding
   `pandas` as a dependency then.
4. **`manager-watch backfill`** (`cli.py`) — replay stored `raw_documents`
   through current parsers after a parser fix.
5. **Alembic initial migration** — models are authoritative; once Postgres
   is up run `alembic revision --autogenerate -m initial && alembic upgrade
   head` (env.py already points at the models + MW_DATABASE_URL).
   `init-db` (create_all) works for dev meanwhile.
6. **robots.txt compliance check** at extractor startup (design §5 guardrail)
   — not yet implemented.
7. **News-archive quote harvesting node** — `extract_quote_paragraphs` exists
   and is keyword-driven, but no orchestrator node fetches archive search
   pages yet (style quotes / departure texts / academy flags).
8. **Soak test** — run `manager-watch run` for 48h against live sources;
   watch structlog output and conditional-GET hit rate (design §verification).

## Verify locally

```bash
.venv/bin/python -m pytest                                   # all offline tests
.venv/bin/manager-watch classify "Motherwell appoint Jane Doe as new manager"
docker compose up -d db && .venv/bin/manager-watch init-db
.venv/bin/manager-watch force-trigger --name "<current manager>"   # live dry-run (network)
```

## Notes / decisions made while building

- Python 3.11 is the floor (`requires-python >= 3.11`); the container uses 3.12.
- `appointments.announced_on` (stored DATE) replaces the design's expression
  index `announced_at::date` so the duplicate guard is portable to SQLite tests.
- A new confirmation while another appointment is ACTIVE supersedes it
  (status → SUPERSEDED) before insert, satisfying the partial unique index.
- Derivation-claim evidence gets stub `raw_documents` rows (http_status=0,
  deduped by url+sha) to keep the FK provenance chain intact; extractor
  evidence should pass real `raw_document_id`s as nodes get wired up.
- Quotes are capped at confidence 0.5 (`evidence/ranking.py`), per design §5.
