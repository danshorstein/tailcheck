from __future__ import annotations

import json
from pathlib import Path

from app.db.connection import SessionLocal, init_db
from app.services.profile_service import build_aircraft_profile

OUT_DIR = Path("processed_data/demo_profiles")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def main() -> None:
    init_db()
    tails = ["N100", "N10000"]
    with SessionLocal() as db:
        for tail in tails:
            profile = build_aircraft_profile(db, tail, use_cache=False)
            out = OUT_DIR / f"{tail}.json"
            out.write_text(json.dumps(profile, indent=2, default=str))
            print(f"Wrote {out}")


if __name__ == "__main__":
    main()
