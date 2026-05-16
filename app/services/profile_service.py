from __future__ import annotations

import re
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import (
    AirworthinessDirective,
    AircraftProfileCache,
    AircraftReference,
    AircraftRegistry,
    FAASDRReport,
    NTSBAircraft,
    NTSBEvent,
)
from app.services.normalization import display_n_number, normalize_n_number
from app.services.sdr_classifier import SDRSourceRecord, enrich_sdr_records, public_record_summary
from app.services.signal_engine import STANDARD_LIMITATIONS, compute_signal_summary

PROFILE_SCHEMA_VERSION = "2026-05-16.enriched-v1"


def _iso(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def _registry_identity(registry: AircraftRegistry, reference: AircraftReference | None):
    return {
        "matched": True,
        "manufacturer": reference.manufacturer if reference else None,
        "model": reference.model if reference else None,
        "serial_number": registry.serial_number,
        "year_mfr": registry.year_mfr,
        "mfr_mdl_code": registry.mfr_mdl_code,
    }


def _registration(registry: AircraftRegistry):
    return {
        "status": registry.status_code,
        "certificate_issue_date": _iso(registry.cert_issue_date),
        "expiration_date": _iso(registry.expiration_date),
        "airworthiness_date": _iso(registry.airworthiness_date),
        "registrant_name": registry.registrant_name,
        "city": registry.city,
        "state": registry.state,
        "country": registry.country,
    }


def _ntsb_record_payload(db: Session, aircraft: NTSBAircraft):
    event = None
    if aircraft.event_id:
        event = (
            db.query(NTSBEvent)
            .filter(NTSBEvent.event_id == aircraft.event_id)
            .order_by(NTSBEvent.event_date.desc().nullslast())
            .first()
        )
    return {
        "event_id": aircraft.event_id,
        "event_date": _iso(event.event_date) if event else None,
        "location_city": event.location_city if event else None,
        "location_state": event.location_state if event else None,
        "investigation_type": event.investigation_type if event else None,
        "injury_severity": event.injury_severity if event else None,
        "report_status": event.report_status if event else None,
        "probable_cause": event.probable_cause if event else None,
        "aircraft_damage": aircraft.aircraft_damage,
        "registration_number_raw": aircraft.registration_number_raw,
        "source_file": aircraft.source_file or (event.source_file if event else None),
    }


def _sdr_record_payload(report: FAASDRReport):
    return {
        "source_year": report.source_year,
        "report_date": _iso(report.report_date),
        "occurrence_date": _iso(report.occurrence_date),
        "ata_code": report.ata_code,
        "ata_description": report.ata_description,
        "component_name": report.component_name,
        "part_name": report.part_name,
        "defect_description": report.defect_description,
        "narrative": report.narrative,
        "source_file": report.source_file,
    }


def _sdr_source_record(report: FAASDRReport) -> SDRSourceRecord:
    return SDRSourceRecord(
        source_year=report.source_year,
        report_date=report.report_date,
        occurrence_date=report.occurrence_date,
        n_number=report.n_number,
        ata_code=report.ata_code,
        ata_description=report.ata_description,
        component_name=report.component_name,
        part_name=report.part_name,
        defect_description=report.defect_description,
        narrative=report.narrative,
        source_file=report.source_file,
    )


def _ad_payload(record: AirworthinessDirective):
    return {
        "document_number": record.document_number,
        "citation": record.citation,
        "title": record.title,
        "publication_date": _iso(record.publication_date),
        "effective_date": _iso(record.effective_date),
        "manufacturer": record.manufacturer,
        "model_terms": record.model_terms,
        "summary": record.summary,
        "federal_register_url": record.federal_register_url,
        "applicability_note": "Model-level result; not proof of aircraft-specific compliance or noncompliance.",
    }


def build_source_list(registry, ntsb_records, sdr_records, ad_records):
    sources = []
    if registry:
        sources.append("FAA Registry")
    sources.append("NTSB")
    sources.append("FAA SDR")
    if ad_records:
        sources.append("Federal Register / FAA AD")
    return sources


def model_family_terms(model: str | None) -> list[str]:
    if not model:
        return []
    normalized = re.sub(r"[^A-Z0-9]", "", model.upper())
    terms = [model]
    leading_family = re.match(r"^([0-9]{2,4})", normalized)
    if leading_family:
        terms.append(leading_family.group(1))
    return list(dict.fromkeys(terms))


def get_cached_profile(db: Session, n_number: str):
    cached = db.get(AircraftProfileCache, n_number)
    if not cached:
        return None
    if not isinstance(cached.profile_json, dict):
        return None
    if cached.profile_json.get("profile_schema_version") != PROFILE_SCHEMA_VERSION:
        return None
    now = datetime.now(UTC)
    expires_at = cached.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at and expires_at <= now:
        return None
    return cached.profile_json


def set_cached_profile(db: Session, n_number: str, profile: dict, ttl_days: int = 30) -> None:
    cached = db.get(AircraftProfileCache, n_number)
    now = datetime.now(UTC)
    expires_at = now + timedelta(days=ttl_days)
    if cached:
        cached.profile_json = profile
        cached.generated_at = now
        cached.expires_at = expires_at
    else:
        db.add(
            AircraftProfileCache(
                n_number=n_number,
                profile_json=profile,
                expires_at=expires_at,
            )
        )
    db.commit()


def query_profile_records(db: Session, n_number: str):
    registry = db.query(AircraftRegistry).filter(AircraftRegistry.n_number == n_number).first()
    reference = None
    if registry and registry.mfr_mdl_code:
        reference = (
            db.query(AircraftReference)
            .filter(AircraftReference.mfr_mdl_code == registry.mfr_mdl_code)
            .first()
        )

    ntsb_filters = [NTSBAircraft.n_number == n_number]
    if registry and registry.serial_number:
        ntsb_filters.append(NTSBAircraft.serial_number == registry.serial_number)
    ntsb_records = db.query(NTSBAircraft).filter(or_(*ntsb_filters)).all()

    sdr_records = (
        db.query(FAASDRReport)
        .filter(FAASDRReport.n_number == n_number)
        .order_by(FAASDRReport.report_date.desc().nullslast())
        .limit(100)
        .all()
    )

    ad_records = []
    if reference and reference.manufacturer and reference.model:
        model_filters = [
            AirworthinessDirective.model_terms.ilike(f"%{term}%")
            for term in model_family_terms(reference.model)
        ]
        ad_records = (
            db.query(AirworthinessDirective)
            .filter(AirworthinessDirective.manufacturer.ilike(f"%{reference.manufacturer}%"))
            .filter(or_(*model_filters))
            .order_by(AirworthinessDirective.publication_date.desc().nullslast())
            .limit(20)
            .all()
        )
    return registry, reference, ntsb_records, sdr_records, ad_records


def build_aircraft_profile(db: Session, n_number_input: str, use_cache: bool = True) -> dict:
    n_number = normalize_n_number(n_number_input)
    if not n_number:
        return {
            "error": "Invalid N-number",
            "limitations": STANDARD_LIMITATIONS,
        }

    if use_cache:
        cached = get_cached_profile(db, n_number)
        if cached:
            return cached

    registry, reference, ntsb_records, sdr_records, ad_records = query_profile_records(
        db, n_number
    )

    if not registry:
        summary = public_record_summary([], [], 0)
        profile = {
            "profile_schema_version": PROFILE_SCHEMA_VERSION,
            "n_number": display_n_number(n_number),
            "identity": {"matched": False},
            "registration": None,
            "ntsb": {"records_found": 0, "records": []},
            "sdr": {"records_found": 0, "recent_records_found": 0, "records": []},
            "airworthiness_directives": {
                "model_level_records_found": 0,
                "records": [],
            },
            "signal_summary": compute_signal_summary(None, [], [], []),
            "summary": summary,
            "limitations": STANDARD_LIMITATIONS,
            "sources": ["FAA Registry", "NTSB", "FAA SDR"],
        }
        set_cached_profile(db, n_number, profile)
        return profile

    recent_cutoff = date.today() - timedelta(days=5 * 365)
    recent_sdr_records = [
        report
        for report in sdr_records
        if report.report_date and report.report_date >= recent_cutoff
    ]
    ntsb_payloads = [_ntsb_record_payload(db, record) for record in ntsb_records]
    base_sdr_payloads = [_sdr_record_payload(record) for record in sdr_records]
    enriched_sdr_payloads = enrich_sdr_records([_sdr_source_record(record) for record in sdr_records])
    sdr_payloads = [
        {**base_payload, **enriched_payload}
        for base_payload, enriched_payload in zip(base_sdr_payloads, enriched_sdr_payloads, strict=True)
    ]

    profile = {
        "profile_schema_version": PROFILE_SCHEMA_VERSION,
        "n_number": display_n_number(n_number),
        "identity": _registry_identity(registry, reference),
        "registration": _registration(registry),
        "ntsb": {
            "records_found": len(ntsb_records),
            "records": ntsb_payloads,
        },
        "sdr": {
            "records_found": len(sdr_records),
            "recent_records_found": len(recent_sdr_records),
            "records": sdr_payloads,
        },
        "airworthiness_directives": {
            "model_level_records_found": len(ad_records),
            "records": [_ad_payload(record) for record in ad_records],
        },
        "signal_summary": compute_signal_summary(
            registry, ntsb_records, sdr_records, ad_records
        ),
        "summary": public_record_summary(
            ntsb_payloads, enriched_sdr_payloads, len(recent_sdr_records)
        ),
        "limitations": STANDARD_LIMITATIONS,
        "sources": build_source_list(registry, ntsb_records, sdr_records, ad_records),
    }
    set_cached_profile(db, n_number, profile)
    return profile


def build_raw_aircraft_records(db: Session, n_number_input: str) -> dict:
    n_number = normalize_n_number(n_number_input)
    if not n_number:
        return {"error": "Invalid N-number"}
    registry, reference, ntsb_records, sdr_records, ad_records = query_profile_records(
        db, n_number
    )
    return {
        "n_number": display_n_number(n_number),
        "registry": registry.raw_json if hasattr(registry, "raw_json") else None,
        "registry_record": _registration(registry) if registry else None,
        "aircraft_reference": {
            "manufacturer": reference.manufacturer,
            "model": reference.model,
            "mfr_mdl_code": reference.mfr_mdl_code,
        }
        if reference
        else None,
        "ntsb_aircraft": [r.raw_json or _ntsb_record_payload(db, r) for r in ntsb_records],
        "faa_sdr_reports": [r.raw_json or _sdr_record_payload(r) for r in sdr_records],
        "airworthiness_directives": [r.raw_json or _ad_payload(r) for r in ad_records],
        "limitations": STANDARD_LIMITATIONS,
    }
