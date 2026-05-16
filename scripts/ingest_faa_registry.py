from __future__ import annotations

import os
import zipfile
from pathlib import Path

import pandas as pd
import requests
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.connection import SessionLocal, init_db
from app.db.models import AircraftReference, AircraftRegistry, EngineReference
from app.services.normalization import clean_columns, display_n_number, normalize_n_number, parse_date

REGISTRY_URL = "https://registry.faa.gov/database/ReleasableAircraft.zip"
RAW_DIR = Path(os.getenv("RAW_DATA_DIR", "./raw_data")) / "faa_registry"
RAW_DIR.mkdir(parents=True, exist_ok=True)


def download_registry() -> Path:
    out = RAW_DIR / "ReleasableAircraft_latest.zip"
    if out.exists() and out.stat().st_size > 0:
        print(f"Using existing file: {out}")
        return out
    headers = {"User-Agent": "Mozilla/5.0 aircraft-public-records-prototype"}
    resp = requests.get(REGISTRY_URL, headers=headers, timeout=120)
    resp.raise_for_status()
    out.write_bytes(resp.content)
    return out


def load_zip_table(zip_path: Path, name: str) -> pd.DataFrame:
    with zipfile.ZipFile(zip_path) as z:
        with z.open(name) as f:
            df = pd.read_csv(f, dtype=str, encoding="latin1", low_memory=False)
    return clean_columns(df)


def _value(row: dict, *keys: str):
    for key in keys:
        value = row.get(key)
        if value is not None and str(value).strip() not in ["", "nan", "NaN"]:
            return str(value).strip()
    return None


def _upsert_sqlite_or_postgres(db, model, unique_key: str, rows: list[dict]) -> int:
    inserted = 0
    for row in rows:
        key_value = row[unique_key]
        existing = db.query(model).filter(getattr(model, unique_key) == key_value).first()
        if existing:
            for k, v in row.items():
                setattr(existing, k, v)
        else:
            db.add(model(**row))
        inserted += 1
        if inserted % 5000 == 0:
            db.commit()
    db.commit()
    return inserted


def map_master_rows(df: pd.DataFrame, source_file: str) -> list[dict]:
    rows = []
    for record in df.to_dict(orient="records"):
        n_number = normalize_n_number(_value(record, "n_number", "n_number_"))
        if not n_number:
            continue
        rows.append(
            {
                "n_number": n_number,
                "n_number_display": display_n_number(n_number),
                "serial_number": _value(record, "serial_number"),
                "mfr_mdl_code": _value(record, "mfr_mdl_code"),
                "engine_mfr_mdl_code": _value(record, "eng_mfr_mdl"),
                "year_mfr": _value(record, "year_mfr"),
                "type_registrant": _value(record, "type_registrant"),
                "registrant_name": _value(record, "name"),
                "city": _value(record, "city"),
                "state": _value(record, "state"),
                "country": _value(record, "country"),
                "last_action_date": parse_date(_value(record, "last_action_date")),
                "cert_issue_date": parse_date(_value(record, "cert_issue_date")),
                "certification": _value(record, "certification"),
                "type_aircraft": _value(record, "type_aircraft"),
                "type_engine": _value(record, "type_engine"),
                "status_code": _value(record, "status_code"),
                "mode_s_code": _value(record, "mode_s_code"),
                "mode_s_code_hex": _value(record, "mode_s_code_hex"),
                "airworthiness_date": parse_date(_value(record, "air_worth_date")),
                "expiration_date": parse_date(_value(record, "expiration_date")),
                "unique_id": _value(record, "unique_id"),
                "source_file": source_file,
            }
        )
    return rows


def map_aircraft_reference_rows(df: pd.DataFrame, source_file: str) -> list[dict]:
    rows = []
    for record in df.to_dict(orient="records"):
        code = _value(record, "code", "mfr_mdl_code")
        if not code:
            continue
        rows.append(
            {
                "mfr_mdl_code": code,
                "manufacturer": _value(record, "mfr", "manufacturer"),
                "model": _value(record, "model"),
                "type_aircraft": _value(record, "type_acft"),
                "type_engine": _value(record, "type_eng"),
                "aircraft_category": _value(record, "ac_cat"),
                "builder_certification": _value(record, "build_cert_ind"),
                "number_engines": _value(record, "no_eng"),
                "number_seats": _value(record, "no_seats"),
                "weight_class": _value(record, "ac_weight"),
                "cruise_speed": _value(record, "speed"),
                "source_file": source_file,
            }
        )
    return rows


def map_engine_reference_rows(df: pd.DataFrame, source_file: str) -> list[dict]:
    rows = []
    for record in df.to_dict(orient="records"):
        code = _value(record, "code", "engine_mfr_mdl_code")
        if not code:
            continue
        rows.append(
            {
                "engine_mfr_mdl_code": code,
                "manufacturer": _value(record, "mfr", "manufacturer"),
                "model": _value(record, "model"),
                "engine_type": _value(record, "type"),
                "horsepower": _value(record, "horsepower"),
                "thrust": _value(record, "thrust"),
                "source_file": source_file,
            }
        )
    return rows


def main() -> None:
    init_db()
    zip_path = download_registry()
    print(f"Registry zip: {zip_path}")

    with zipfile.ZipFile(zip_path) as z:
        names = z.namelist()
        print("Zip contents:", names)
        for required in ["MASTER.txt", "ACFTREF.txt", "ENGINE.txt"]:
            if required not in names:
                raise RuntimeError(f"Missing {required}")

    master = load_zip_table(zip_path, "MASTER.txt")
    acftref = load_zip_table(zip_path, "ACFTREF.txt")
    engine = load_zip_table(zip_path, "ENGINE.txt")
    print("MASTER rows:", len(master))
    print("ACFTREF rows:", len(acftref))
    print("ENGINE rows:", len(engine))

    with SessionLocal() as db:
        registry_count = _upsert_sqlite_or_postgres(
            db, AircraftRegistry, "n_number", map_master_rows(master, zip_path.name)
        )
        aircraft_ref_count = _upsert_sqlite_or_postgres(
            db,
            AircraftReference,
            "mfr_mdl_code",
            map_aircraft_reference_rows(acftref, zip_path.name),
        )
        engine_ref_count = _upsert_sqlite_or_postgres(
            db,
            EngineReference,
            "engine_mfr_mdl_code",
            map_engine_reference_rows(engine, zip_path.name),
        )
    print(
        f"Upserted registry={registry_count:,} aircraft_ref={aircraft_ref_count:,} engine_ref={engine_ref_count:,}"
    )


if __name__ == "__main__":
    main()
