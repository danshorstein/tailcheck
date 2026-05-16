from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from collections import defaultdict
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, text

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.services.normalization import display_n_number, normalize_n_number, parse_date
from app.services.sdr_classifier import SDRSourceRecord, enrich_sdr_records, public_record_summary
from app.services.signal_engine import STANDARD_LIMITATIONS

STATIC_SCHEMA_VERSION = "2026-05-16.static-v1"
DISCLAIMER = "Public records only - not a complete maintenance history or FAA airworthiness determination."
STATIC_LIMITATIONS = [
    "This profile uses public datasets searched by TailCheck.",
    "It is not a complete maintenance history.",
    "It is not an FAA airworthiness determination.",
    "No public records found does not mean no events, defects, or maintenance issues exist.",
    "Tail numbers can be reassigned; serial-number matching should be used when possible.",
]
MAX_TEXT_LENGTH = 320


def source_database_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite:///./aircraft_records.db")


def shard_key(n_number: str | None, shard_length: int = 2) -> str:
    normalized = normalize_n_number(n_number)
    if not normalized:
        return "_" * shard_length
    return normalized[:shard_length].upper().ljust(shard_length, "_")


def shard_relative_path(key: str, directory_length: int = 2) -> Path:
    if directory_length <= 0:
        return Path(f"{key}.json")
    return Path(key[:directory_length]) / f"{key}.json"


def json_default(value: Any) -> str | None:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return str(value) if value is not None else None


def short_text(value: Any, limit: int = MAX_TEXT_LENGTH) -> str | None:
    if value is None:
        return None
    text_value = " ".join(str(value).split())
    if not text_value:
        return None
    if len(text_value) <= limit:
        return text_value
    return f"{text_value[: limit - 1]}…"


def compact(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: compact(item)
            for key, item in value.items()
            if item is not None and item != [] and item != {}
        }
    if isinstance(value, list):
        return [compact(item) for item in value if item is not None]
    return value


def iso_date(value: Any) -> str | None:
    parsed = parse_date(value)
    return parsed.isoformat() if parsed else None


def rows_by_key(rows: list[dict[str, Any]], key: str) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        value = row.get(key)
        if value:
            grouped[str(value)].append(row)
    return grouped


def fetch_source_counts(conn) -> dict[str, dict[str, int]]:
    counts = {}
    for name, table in [
        ("faa_registry", "aircraft_registry"),
        ("faa_sdr", "faa_sdr_reports"),
        ("ntsb_aircraft", "ntsb_aircraft"),
        ("ntsb_events", "ntsb_events"),
        ("airworthiness_directives", "airworthiness_directives"),
    ]:
        counts[name] = {"records": conn.execute(text(f"select count(*) from {table}")).scalar_one()}
    return counts


def fetch_sdr_records(conn) -> dict[str, list[dict[str, Any]]]:
    rows = conn.execute(
        text(
            """
            select
              id,
              source_year,
              report_date,
              occurrence_date,
              n_number,
              registration_number_raw,
              aircraft_manufacturer,
              aircraft_model,
              aircraft_serial_number,
              operator_name,
              operation_type,
              ata_code,
              ata_description,
              segment,
              component_name,
              part_name,
              part_number,
              defect_description,
              narrative,
              source_file
            from faa_sdr_reports
            where n_number is not null and n_number != ''
            order by n_number, report_date desc
            """
        )
    ).mappings()
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        item = dict(row)
        grouped[str(item["n_number"])].append(item)
    return grouped


def fetch_ntsb_records(conn) -> tuple[dict[str, list[dict[str, Any]]], dict[str, list[dict[str, Any]]]]:
    rows = conn.execute(
        text(
            """
            select
              a.id,
              a.event_id,
              a.n_number,
              a.serial_number,
              a.aircraft_make,
              a.aircraft_model,
              a.aircraft_category,
              a.number_of_engines,
              a.engine_type,
              a.aircraft_damage,
              a.registration_number_raw,
              a.source_file as aircraft_source_file,
              e.event_date,
              e.location_city,
              e.location_state,
              e.country,
              e.investigation_type,
              e.injury_severity,
              e.report_status,
              e.probable_cause,
              e.source_file as event_source_file
            from ntsb_aircraft a
            left join ntsb_events e on e.event_id = a.event_id
            """
        )
    ).mappings()
    by_n: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_serial: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        item = dict(row)
        if item.get("n_number"):
            by_n[str(item["n_number"])].append(item)
        if item.get("serial_number"):
            by_serial[str(item["serial_number"])].append(item)
    return by_n, by_serial


def fetch_registry_records(conn):
    return conn.execute(
        text(
            """
            select
              r.n_number,
              r.n_number_display,
              r.serial_number,
              r.mfr_mdl_code,
              r.engine_mfr_mdl_code,
              r.year_mfr,
              r.type_registrant,
              r.registrant_name,
              r.city,
              r.state,
              r.country,
              r.last_action_date,
              r.cert_issue_date,
              r.certification,
              r.type_aircraft,
              r.type_engine,
              r.status_code,
              r.mode_s_code,
              r.mode_s_code_hex,
              r.airworthiness_date,
              r.expiration_date,
              r.unique_id,
              r.source_file,
              ref.manufacturer,
              ref.model,
              ref.aircraft_category,
              ref.builder_certification,
              ref.number_engines,
              ref.number_seats,
              ref.weight_class,
              ref.cruise_speed
            from aircraft_registry r
            left join aircraft_reference ref on ref.mfr_mdl_code = r.mfr_mdl_code
            order by r.n_number
            """
        )
    ).mappings()


def make_sdr_source_record(row: dict[str, Any]) -> SDRSourceRecord:
    return SDRSourceRecord(
        source_year=row.get("source_year"),
        report_date=parse_date(row.get("report_date")),
        occurrence_date=parse_date(row.get("occurrence_date")),
        n_number=row.get("n_number"),
        ata_code=row.get("ata_code"),
        ata_description=row.get("ata_description"),
        component_name=row.get("component_name"),
        part_name=row.get("part_name"),
        defect_description=row.get("defect_description"),
        narrative=row.get("narrative"),
        source_file=row.get("source_file"),
    )


def sdr_payloads(rows: list[dict[str, Any]], max_records: int | None) -> tuple[list[dict[str, Any]], int]:
    selected = rows[:max_records] if max_records else rows
    enriched = enrich_sdr_records([make_sdr_source_record(row) for row in selected])
    payloads = []
    for row, extra in zip(selected, enriched, strict=True):
        report_id = row.get("id") or extra["record_id"]
        extra = {**extra}
        extra["raw_narrative"] = short_text(extra.get("raw_narrative"))
        extra["user_facing_summary"] = short_text(extra.get("user_facing_summary"))
        payload = compact(
            {
                "report_id": f"SDR-{report_id}",
                "source_year": row.get("source_year"),
                "report_date": iso_date(row.get("report_date")),
                "occurrence_date": iso_date(row.get("occurrence_date")),
                "manufacturer": row.get("aircraft_manufacturer"),
                "model": row.get("aircraft_model"),
                "ata_code": row.get("ata_code"),
                "ata_category": extra.get("ata_group"),
                "component": row.get("component_name") or row.get("part_name"),
                "part_name": row.get("part_name"),
                "problem": short_text(row.get("defect_description")),
                "narrative_summary": short_text(row.get("narrative") or row.get("defect_description")),
                "source_file": row.get("source_file"),
                "match_basis": "N-number",
                **extra,
            }
        )
        payload.setdefault("event_flags", [])
        payload.setdefault("display_chips", [])
        payloads.append(payload)
    return payloads, len(rows)


def ntsb_payloads(
    n_number: str,
    serial_number: str | None,
    ntsb_by_n: dict[str, list[dict[str, Any]]],
    ntsb_by_serial: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    rows = [*ntsb_by_n.get(n_number, [])]
    if serial_number:
        rows.extend(ntsb_by_serial.get(serial_number, []))
    seen = set()
    payloads = []
    for row in rows:
        key = (row.get("event_id"), row.get("serial_number"), row.get("n_number"), row.get("id"))
        if key in seen:
            continue
        seen.add(key)
        payloads.append(
            compact(
                {
                "event_id": row.get("event_id"),
                "event_date": iso_date(row.get("event_date")),
                "event_type": row.get("investigation_type"),
                "location": ", ".join(
                    part for part in [row.get("location_city"), row.get("location_state")] if part
                )
                or None,
                "location_city": row.get("location_city"),
                "location_state": row.get("location_state"),
                "country": row.get("country"),
                "injury_severity": row.get("injury_severity"),
                "aircraft_damage": row.get("aircraft_damage"),
                "investigation_status": row.get("report_status"),
                "probable_cause": short_text(row.get("probable_cause")),
                "registration_number_raw": row.get("registration_number_raw"),
                "match_basis": "N-number + serial" if serial_number and row.get("serial_number") == serial_number else "N-number",
                "source_file": row.get("aircraft_source_file") or row.get("event_source_file"),
                }
            )
        )
    return payloads


def legacy_signal(signal: str) -> str:
    return {
        "none_found": "No major public records found",
        "low": "Some public records found",
        "moderate": "Some public records found",
        "elevated": "Elevated public-records signal",
        "notable": "Elevated public-records signal",
    }.get(signal, "Incomplete / ambiguous data")


def title_for_summary(summary: dict[str, Any]) -> str:
    return summary.get("profile_summary_label") or "Public-record profile"


def empty_record_summary() -> dict[str, Any]:
    return {
        "public_record_signal": "none_found",
        "profile_summary_label": "No NTSB or SDR public records found",
        "most_notable_factor": "No NTSB or SDR records found",
        "ntsb_records_found": 0,
        "sdr_records_found": 0,
        "recent_sdr_records_found": 0,
        "disclaimer": DISCLAIMER,
    }


def profile_for_registry_row(
    row: dict[str, Any],
    sdr_by_n: dict[str, list[dict[str, Any]]],
    ntsb_by_n: dict[str, list[dict[str, Any]]],
    ntsb_by_serial: dict[str, list[dict[str, Any]]],
    generated_at: str,
    max_sdr_records: int | None,
) -> dict[str, Any]:
    n_number = str(row["n_number"])
    display = display_n_number(n_number)
    sdr_rows = sdr_by_n.get(n_number, [])
    ntsb_records = ntsb_payloads(n_number, row.get("serial_number"), ntsb_by_n, ntsb_by_serial)
    sdr_records, sdr_total = sdr_payloads(sdr_rows, max_sdr_records) if sdr_rows else ([], 0)

    recent_cutoff = date.today() - timedelta(days=5 * 365)
    recent_sdr_count = 0
    for sdr_row in sdr_rows:
        report_date = parse_date(sdr_row.get("report_date"))
        if report_date and report_date >= recent_cutoff:
            recent_sdr_count += 1

    if sdr_total or ntsb_records:
        summary = public_record_summary(ntsb_records, sdr_records, recent_sdr_count)
        summary.pop("limitations", None)
        summary["sdr_records_found"] = sdr_total
        summary["ntsb_records_found"] = len(ntsb_records)
        summary["disclaimer"] = DISCLAIMER
        summary["notable_events"] = [
            {
                "record_id": item.get("record_id"),
                "report_date": item.get("report_date"),
                "ata_code": item.get("ata_code"),
                "system_category": item.get("system_category"),
                "event_flags": item.get("event_flags", []),
                "user_facing_summary": item.get("user_facing_summary"),
            }
            for item in sdr_records
            if any(
                flag
                in {
                    "rejected_takeoff",
                    "fire_or_overheat_indication",
                    "smoke_or_fumes",
                    "crack_or_structural_damage",
                    "brake_or_directional_control",
                }
                for flag in item.get("event_flags", [])
            )
        ][:10]
    else:
        summary = empty_record_summary()

    identity = {
        "matched": True,
        "manufacturer": row.get("manufacturer"),
        "model": row.get("model"),
        "serial_number": row.get("serial_number"),
        "year_mfr": row.get("year_mfr"),
        "mfr_mdl_code": row.get("mfr_mdl_code"),
        "registrant_name": row.get("registrant_name"),
    }
    registration = {
        "status": row.get("status_code"),
        "certificate_issue_date": iso_date(row.get("cert_issue_date")),
        "expiration_date": iso_date(row.get("expiration_date")),
        "airworthiness_date": iso_date(row.get("airworthiness_date")),
        "registrant_name": row.get("registrant_name"),
        "city": row.get("city"),
        "state": row.get("state"),
        "country": row.get("country"),
    }

    profile = {
        "profile_schema_version": STATIC_SCHEMA_VERSION,
        "snapshot_generated_at": generated_at,
        "n_number": display,
        "identity": identity,
        "registration": registration,
        "summary": summary,
    }
    if ntsb_records:
        profile["ntsb"] = {
            "records_found": len(ntsb_records),
            "records": ntsb_records,
        }
    if sdr_total:
        profile["sdr"] = {
            "records_found": sdr_total,
            "recent_records_found": recent_sdr_count,
            "records": sdr_records,
        }
    return compact(profile)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, default=json_default, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def export_static_profiles(
    output_dir: Path,
    max_sdr_records: int | None,
    clean: bool,
    shard_length: int,
) -> dict[str, Any]:
    if shard_length < 1:
        raise ValueError("shard_length must be at least 1")
    if clean and output_dir.exists():
        shutil.rmtree(output_dir)
    (output_dir / "profiles").mkdir(parents=True, exist_ok=True)

    generated_at = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    engine = create_engine(source_database_url())
    shards: dict[str, dict[str, Any]] = defaultdict(dict)

    with engine.connect() as conn:
        counts = fetch_source_counts(conn)
        sdr_by_n = fetch_sdr_records(conn)
        ntsb_by_n, ntsb_by_serial = fetch_ntsb_records(conn)

        profile_count = 0
        records_bearing_count = 0
        for mapping in fetch_registry_records(conn):
            row = dict(mapping)
            n_number = normalize_n_number(row.get("n_number"))
            if not n_number:
                continue
            profile = profile_for_registry_row(
                row=row,
                sdr_by_n=sdr_by_n,
                ntsb_by_n=ntsb_by_n,
                ntsb_by_serial=ntsb_by_serial,
                generated_at=generated_at,
                max_sdr_records=max_sdr_records,
            )
            shards[shard_key(n_number, shard_length)][n_number] = profile
            profile_count += 1
            if profile.get("sdr", {}).get("records_found") or profile.get("ntsb", {}).get("records_found"):
                records_bearing_count += 1

    shard_names = sorted(shards)
    for name in shard_names:
        write_json(output_dir / "profiles" / shard_relative_path(name), shards[name])

    manifest = {
        "schema_version": STATIC_SCHEMA_VERSION,
        "generated_at": generated_at,
        "shard_length": shard_length,
        "shard_directory_length": min(2, shard_length),
        "snapshot_label": f"FAA/NTSB/SDR public-record snapshot generated {generated_at[:10]}",
        "profile_count": profile_count,
        "records_bearing_profile_count": records_bearing_count,
        "shards": shard_names,
        "sources": counts,
        "limitations": STATIC_LIMITATIONS,
        "disclaimer": DISCLAIMER,
    }
    write_json(output_dir / "manifest.json", manifest)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Export TailCheck static profile shards.")
    parser.add_argument("--output", default="frontend/public/data", help="Output data directory.")
    parser.add_argument(
        "--max-sdr-records",
        type=int,
        default=12,
        help="Maximum enriched SDR records embedded per aircraft. Counts still reflect all records.",
    )
    parser.add_argument(
        "--shard-length",
        type=int,
        default=3,
        help="Number of normalized N-number characters used for profile shard filenames.",
    )
    parser.add_argument("--no-clean", action="store_true", help="Do not delete existing output first.")
    args = parser.parse_args()

    manifest = export_static_profiles(
        output_dir=Path(args.output),
        max_sdr_records=args.max_sdr_records,
        clean=not args.no_clean,
        shard_length=args.shard_length,
    )
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
