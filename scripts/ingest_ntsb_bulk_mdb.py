from __future__ import annotations

import os
from pathlib import Path

import pandas as pd

from app.db.connection import SessionLocal, init_db
from app.db.models import NTSBAircraft, NTSBEvent
from app.services.normalization import clean_columns, normalize_n_number, parse_date

RAW_DIR = Path(os.getenv("RAW_DATA_DIR", "./raw_data")) / "ntsb" / "csv"

EVENT_TABLE_CANDIDATES = ["events", "Event", "event"]
AIRCRAFT_TABLE_CANDIDATES = ["aircraft", "Aircraft", "aircrafts"]
NARRATIVE_TABLE_CANDIDATES = ["narratives", "Narratives", "narrative"]


def _value(row: dict, *keys: str):
    for key in keys:
        value = row.get(key)
        if value is not None and str(value).strip() not in ["", "nan", "NaN"]:
            return str(value).strip()
    return None


def load_csv_if_exists(name: str) -> pd.DataFrame | None:
    path = RAW_DIR / f"{name}.csv"
    if not path.exists():
        return None
    return clean_columns(pd.read_csv(path, dtype=str, low_memory=False))


def first_existing_table(candidates: list[str]) -> tuple[str, pd.DataFrame] | None:
    for candidate in candidates:
        df = load_csv_if_exists(candidate)
        if df is not None:
            return candidate, df
    return None


def find_candidate_tables() -> None:
    print("Available NTSB CSV files:")
    for path in sorted(RAW_DIR.glob("*.csv")):
        print(" -", path.name)


def ingest_events(table_name: str, df: pd.DataFrame) -> int:
    rows = []
    for record in df.to_dict(orient="records"):
        event_id = _value(record, "ev_id", "event_id")
        if not event_id:
            continue
        rows.append(
            NTSBEvent(
                event_id=event_id,
                investigation_number=_value(record, "ntsb_no", "investigation_number"),
                event_date=parse_date(_value(record, "ev_date", "event_date")),
                location_city=_value(record, "city", "location_city", "ev_city"),
                location_state=_value(record, "state", "location_state", "ev_state"),
                country=_value(record, "country", "ev_country"),
                investigation_type=_value(record, "investigation_type", "ev_type"),
                accident_number=_value(record, "accident_number"),
                report_status=_value(record, "report_status"),
                injury_severity=_value(record, "injury_severity", "highest_injury", "ev_highest_injury"),
                raw_json=record,
                source_file=f"{table_name}.csv",
            )
        )
    with SessionLocal() as db:
        db.query(NTSBEvent).filter(NTSBEvent.source_file == f"{table_name}.csv").delete()
        db.add_all(rows)
        db.commit()
    return len(rows)


def ingest_aircraft(table_name: str, df: pd.DataFrame) -> int:
    rows = []
    for record in df.to_dict(orient="records"):
        raw_reg = _value(record, "regis_no", "registration_number", "n_number")
        rows.append(
            NTSBAircraft(
                event_id=_value(record, "ev_id", "event_id"),
                n_number=normalize_n_number(raw_reg),
                serial_number=_value(record, "serial_no", "aircraft_serial_number", "acft_serial_no"),
                aircraft_make=_value(record, "make", "aircraft_make", "acft_make"),
                aircraft_model=_value(record, "model", "aircraft_model", "acft_model"),
                aircraft_category=_value(record, "aircraft_category", "acft_category"),
                number_of_engines=_value(record, "num_eng", "number_of_engines"),
                engine_type=_value(record, "eng_type", "engine_type"),
                aircraft_damage=_value(record, "damage", "aircraft_damage"),
                registration_number_raw=raw_reg,
                raw_json=record,
                source_file=f"{table_name}.csv",
            )
        )
    with SessionLocal() as db:
        db.query(NTSBAircraft).filter(NTSBAircraft.source_file == f"{table_name}.csv").delete()
        db.add_all(rows)
        db.commit()
    return len(rows)


def main() -> None:
    init_db()
    find_candidate_tables()

    for path in sorted(RAW_DIR.glob("*.csv"))[:6]:
        df = clean_columns(pd.read_csv(path, dtype=str, nrows=5, low_memory=False))
        print(f"\n{path.stem} columns:")
        print(list(df.columns))
        print(df.head().to_string())

    event_table = first_existing_table(EVENT_TABLE_CANDIDATES)
    aircraft_table = first_existing_table(AIRCRAFT_TABLE_CANDIDATES)
    if not event_table or not aircraft_table:
        raise RuntimeError("Could not identify both event and aircraft NTSB CSV tables.")

    event_name, event_df = event_table
    aircraft_name, aircraft_df = aircraft_table
    print(f"Inserted {ingest_events(event_name, event_df):,} NTSB event rows")
    print(f"Inserted {ingest_aircraft(aircraft_name, aircraft_df):,} NTSB aircraft rows")


if __name__ == "__main__":
    main()
