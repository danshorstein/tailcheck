# Aircraft Public Records Backend

Backend data layer for a U.S.-first aircraft public-records lookup product.

The service returns a public-records safety signal profile for an FAA N-number. It is not an airworthiness determination, a complete maintenance history, or a definitive safety rating.

## Quick Start

```bash
python -m venv .venv
./.venv/bin/pip install -r requirements.txt
cp .env.example .env
DATABASE_URL=sqlite:///./aircraft_records.db ./.venv/bin/uvicorn app.main:app --reload
```

Try:

```bash
curl http://localhost:8000/api/v1/aircraft/N100/profile
```

Until real source files are ingested, the endpoint returns a structured incomplete-data profile.

## Tests

```bash
./.venv/bin/python -m pytest
```

## Frontend Contract

The `/api/v1/aircraft/{n_number}/profile` response preserves raw source records while adding deterministic SDR enrichment fields and a frontend-ready `summary` object. Enum values are documented in `docs/frontend_enums.md`.

## Static Snapshot Frontend

TailCheck can also run as a Vercel-hosted static demo with no runtime Python API, database, or AI dependency. The local Python pipeline exports sharded JSON files under `frontend/public/data`, and the browser fetches only `manifest.json` plus the relevant profile shard for a searched N-number.

Generate and validate the snapshot:

```bash
./.venv/bin/python scripts/export_static_profiles.py --output frontend/public/data --shard-length 3
./.venv/bin/python scripts/validate_static_export.py --data-dir frontend/public/data
```

Run the static frontend locally:

```bash
cd frontend
python3 -m http.server 8081
```

When served by Vercel, data is fetched from `/data/...`. When served by the simple local Python server, the frontend falls back to `/public/data/...`.

The static export keeps full active-registry N-number coverage. Aircraft with SDR/NTSB records include deterministic enriched summaries and capped embedded record details; aircraft with no SDR/NTSB records include compact registry identity and zero public-record counts. Profile shards use nested paths such as `frontend/public/data/profiles/62/628.json` for `N62849`, keeping GitHub directory width manageable.

## Source Ingest Scripts

```bash
python scripts/ingest_faa_registry.py
python scripts/ingest_faa_sdr.py
RAW_DATA_DIR=./raw_data ./scripts/extract_ntsb_mdb.sh
python scripts/ingest_ntsb_bulk_mdb.py
python scripts/fetch_ad_records.py
```

Some public sources may block automated download from non-browser environments. In that case, place manually downloaded files under `raw_data/` using the names expected by the scripts.
