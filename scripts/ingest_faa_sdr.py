from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
import requests

from app.db.connection import SessionLocal, init_db
from app.db.models import FAASDRReport
from app.services.normalization import clean_columns, normalize_n_number, parse_date

RAW_DIR = Path(os.getenv("RAW_DATA_DIR", "./raw_data")) / "faa_sdr"
RAW_DIR.mkdir(parents=True, exist_ok=True)

SDR_URL = "https://external.apic4e.faa.gov/sdrs/retrieve/SDR-{year}.csv"

COLUMN_ALIASES = {
    "n_number": [
        "aircraft_registration",
        "registration",
        "reg_no",
        "aircraft_reg",
        "n_number",
        "registration_number",
        "aircraft_registration_no",
        "registrynnumber",
    ],
    "report_date": ["date_of_report", "report_date", "submitted_date", "difficultydate"],
    "occurrence_date": ["date_of_occurrence", "occurrence_date", "submissiondate"],
    "aircraft_manufacturer": ["aircraft_manufacturer", "manufacturer", "make", "aircraftmake"],
    "aircraft_model": ["aircraft_manufacturer_model", "aircraft_model", "model", "aircraftmodel"],
    "aircraft_serial_number": ["aircraft_serial_number", "serial_number", "aircraftserialnumber"],
    "ata_code": ["jasc_code", "ata_code", "air_transport_association_code", "jasccode"],
    "ata_description": ["jasc_description", "ata_description"],
    "component_name": ["component_name", "component", "componentname"],
    "part_name": ["part_name", "part", "partname"],
    "part_number": ["part_number"],
    "defect_description": ["problem", "defect", "malfunction_defect", "defect_description"],
    "narrative": ["narrative", "comments", "remarks", "description", "discrepancy"],
}


def download_sdr_year(year: int) -> Path | None:
    url = SDR_URL.format(year=year)
    out = RAW_DIR / f"SDR-{year}.csv"

    if out.exists() and out.stat().st_size > 0:
        print(f"Using existing file: {out}")
        return out

    headers = {
        "User-Agent": "Mozilla/5.0 aircraft-public-records-prototype",
        "Accept": "text/csv,application/csv,text/plain,*/*",
        "Referer": "https://www.faa.gov/av-info/download_SDR",
    }

    try:
        resp = requests.get(url, headers=headers, timeout=120)
        if resp.status_code == 403:
            print(f"403 for {year}. Download manually from: {url}")
            return None
        resp.raise_for_status()
        out.write_bytes(resp.content)
        print(f"Downloaded {year}: {out} ({out.stat().st_size:,} bytes)")
        return out
    except Exception as exc:
        print(f"Failed {year}: {exc}")
        return None


def read_sdr_csv(path: Path, nrows: int | None = None) -> pd.DataFrame:
    try:
        return pd.read_csv(path, dtype=str, nrows=nrows, low_memory=False)
    except UnicodeDecodeError:
        return pd.read_csv(path, dtype=str, nrows=nrows, encoding="latin1", low_memory=False)


def get_first_existing(row: dict, aliases: list[str]):
    for key in aliases:
        if key not in row:
            continue
        value = row[key]
        if pd.isna(value):
            continue
        if str(value).strip() in ["", "nan", "NaN"]:
            continue
        return value
    return None


def canonical_value(row: dict, key: str):
    return get_first_existing(row, COLUMN_ALIASES.get(key, [key]))


def ingest_sdr_file(path: Path, source_year: int) -> int:
    df = clean_columns(read_sdr_csv(path))
    rows = []
    for record in df.to_dict(orient="records"):
        raw_reg = canonical_value(record, "n_number")
        rows.append(
            FAASDRReport(
                source_year=source_year,
                report_date=parse_date(canonical_value(record, "report_date")),
                occurrence_date=parse_date(canonical_value(record, "occurrence_date")),
                n_number=normalize_n_number(raw_reg),
                registration_number_raw=raw_reg,
                aircraft_manufacturer=canonical_value(record, "aircraft_manufacturer"),
                aircraft_model=canonical_value(record, "aircraft_model"),
                aircraft_serial_number=canonical_value(record, "aircraft_serial_number"),
                ata_code=canonical_value(record, "ata_code"),
                ata_description=canonical_value(record, "ata_description"),
                component_name=canonical_value(record, "component_name"),
                part_name=canonical_value(record, "part_name"),
                part_number=canonical_value(record, "part_number"),
                defect_description=canonical_value(record, "defect_description"),
                narrative=canonical_value(record, "narrative"),
                raw_json=record,
                source_file=path.name,
            )
        )
    with SessionLocal() as db:
        db.query(FAASDRReport).filter(FAASDRReport.source_file == path.name).delete()
        db.add_all(rows)
        db.commit()
    return len(rows)


def main() -> None:
    init_db()
    years = [2022, 2023, 2024, 2025, 2026]
    for year in years:
        path = download_sdr_year(year)
        if not path:
            continue
        sample = clean_columns(read_sdr_csv(path, nrows=10))
        print(f"\n{year} columns:")
        print(list(sample.columns))
        print(sample.head(3).to_string())
        print(f"Inserted {ingest_sdr_file(path, year):,} SDR rows for {year}")


if __name__ == "__main__":
    main()
