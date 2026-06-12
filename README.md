# manager-watch

Automated monitoring + deterministic (no AI APIs) research pipeline that
detects confirmed Motherwell F.C. managerial appointments and produces an
evidence-linked dossier (tactical profile, youth development, career
history).

- **Design document:** [`docs/manager-watch-system-design.md`](docs/manager-watch-system-design.md)
- **Implementation status / next steps:** [`HANDOFF.md`](HANDOFF.md)

## Quick start

```bash
python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/python -m pytest                      # 65 offline tests

docker compose up -d db                          # PostgreSQL 16
.venv/bin/manager-watch init-db                  # create tables, seed sources
.venv/bin/manager-watch run                      # start the monitor (blocks)
```

## CLI

```bash
manager-watch classify "Motherwell appoint Jane Doe as new manager"   # debug the rule engine
manager-watch force-trigger --name "Jane Doe"                          # dry-run the research pipeline
manager-watch render <appointment_id>                                  # re-render a dossier
```

Configuration lives in `config/` (sources, rule patterns, league tiers) and
environment variables prefixed `MW_` (see `src/manager_watch/settings.py`).
