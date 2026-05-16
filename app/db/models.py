from __future__ import annotations

from sqlalchemy import JSON, BigInteger, Date, DateTime, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.connection import Base


def pk_type():
    return BigInteger().with_variant(Integer, "sqlite")


class AircraftRegistry(Base):
    __tablename__ = "aircraft_registry"

    id: Mapped[int] = mapped_column(pk_type(), primary_key=True, autoincrement=True)
    n_number: Mapped[str] = mapped_column(Text, unique=True, index=True, nullable=False)
    n_number_display: Mapped[str] = mapped_column(Text, nullable=False)
    serial_number: Mapped[str | None] = mapped_column(Text)
    mfr_mdl_code: Mapped[str | None] = mapped_column(Text)
    engine_mfr_mdl_code: Mapped[str | None] = mapped_column(Text)
    year_mfr: Mapped[str | None] = mapped_column(Text)
    type_registrant: Mapped[str | None] = mapped_column(Text)
    registrant_name: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(Text)
    state: Mapped[str | None] = mapped_column(Text)
    country: Mapped[str | None] = mapped_column(Text)
    last_action_date: Mapped[object | None] = mapped_column(Date)
    cert_issue_date: Mapped[object | None] = mapped_column(Date)
    certification: Mapped[str | None] = mapped_column(Text)
    type_aircraft: Mapped[str | None] = mapped_column(Text)
    type_engine: Mapped[str | None] = mapped_column(Text)
    status_code: Mapped[str | None] = mapped_column(Text)
    mode_s_code: Mapped[str | None] = mapped_column(Text)
    mode_s_code_hex: Mapped[str | None] = mapped_column(Text)
    airworthiness_date: Mapped[object | None] = mapped_column(Date)
    expiration_date: Mapped[object | None] = mapped_column(Date)
    unique_id: Mapped[str | None] = mapped_column(Text)
    source_file: Mapped[str | None] = mapped_column(Text)
    source_refreshed_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())


class AircraftReference(Base):
    __tablename__ = "aircraft_reference"

    id: Mapped[int] = mapped_column(pk_type(), primary_key=True, autoincrement=True)
    mfr_mdl_code: Mapped[str] = mapped_column(Text, unique=True, index=True, nullable=False)
    manufacturer: Mapped[str | None] = mapped_column(Text)
    model: Mapped[str | None] = mapped_column(Text)
    type_aircraft: Mapped[str | None] = mapped_column(Text)
    type_engine: Mapped[str | None] = mapped_column(Text)
    aircraft_category: Mapped[str | None] = mapped_column(Text)
    builder_certification: Mapped[str | None] = mapped_column(Text)
    number_engines: Mapped[str | None] = mapped_column(Text)
    number_seats: Mapped[str | None] = mapped_column(Text)
    weight_class: Mapped[str | None] = mapped_column(Text)
    cruise_speed: Mapped[str | None] = mapped_column(Text)
    source_file: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())


class EngineReference(Base):
    __tablename__ = "engine_reference"

    id: Mapped[int] = mapped_column(pk_type(), primary_key=True, autoincrement=True)
    engine_mfr_mdl_code: Mapped[str] = mapped_column(Text, unique=True, index=True, nullable=False)
    manufacturer: Mapped[str | None] = mapped_column(Text)
    model: Mapped[str | None] = mapped_column(Text)
    engine_type: Mapped[str | None] = mapped_column(Text)
    horsepower: Mapped[str | None] = mapped_column(Text)
    thrust: Mapped[str | None] = mapped_column(Text)
    source_file: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())


class NTSBEvent(Base):
    __tablename__ = "ntsb_events"

    id: Mapped[int] = mapped_column(pk_type(), primary_key=True, autoincrement=True)
    event_id: Mapped[str | None] = mapped_column(Text, index=True)
    investigation_number: Mapped[str | None] = mapped_column(Text)
    event_date: Mapped[object | None] = mapped_column(Date, index=True)
    location_city: Mapped[str | None] = mapped_column(Text)
    location_state: Mapped[str | None] = mapped_column(Text)
    country: Mapped[str | None] = mapped_column(Text)
    investigation_type: Mapped[str | None] = mapped_column(Text)
    accident_number: Mapped[str | None] = mapped_column(Text)
    report_status: Mapped[str | None] = mapped_column(Text)
    injury_severity: Mapped[str | None] = mapped_column(Text)
    probable_cause: Mapped[str | None] = mapped_column(Text)
    raw_json: Mapped[dict | None] = mapped_column(JSON)
    source_file: Mapped[str | None] = mapped_column(Text)
    source_refreshed_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())


class NTSBAircraft(Base):
    __tablename__ = "ntsb_aircraft"

    id: Mapped[int] = mapped_column(pk_type(), primary_key=True, autoincrement=True)
    event_id: Mapped[str | None] = mapped_column(Text, index=True)
    n_number: Mapped[str | None] = mapped_column(Text, index=True)
    serial_number: Mapped[str | None] = mapped_column(Text, index=True)
    aircraft_make: Mapped[str | None] = mapped_column(Text)
    aircraft_model: Mapped[str | None] = mapped_column(Text)
    aircraft_category: Mapped[str | None] = mapped_column(Text)
    number_of_engines: Mapped[str | None] = mapped_column(Text)
    engine_type: Mapped[str | None] = mapped_column(Text)
    aircraft_damage: Mapped[str | None] = mapped_column(Text)
    registration_number_raw: Mapped[str | None] = mapped_column(Text)
    raw_json: Mapped[dict | None] = mapped_column(JSON)
    source_file: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())


class FAASDRReport(Base):
    __tablename__ = "faa_sdr_reports"

    id: Mapped[int] = mapped_column(pk_type(), primary_key=True, autoincrement=True)
    source_year: Mapped[int | None] = mapped_column(Integer)
    report_date: Mapped[object | None] = mapped_column(Date, index=True)
    occurrence_date: Mapped[object | None] = mapped_column(Date)
    n_number: Mapped[str | None] = mapped_column(Text, index=True)
    registration_number_raw: Mapped[str | None] = mapped_column(Text)
    aircraft_manufacturer: Mapped[str | None] = mapped_column(Text, index=True)
    aircraft_model: Mapped[str | None] = mapped_column(Text, index=True)
    aircraft_serial_number: Mapped[str | None] = mapped_column(Text)
    operator_name: Mapped[str | None] = mapped_column(Text)
    operation_type: Mapped[str | None] = mapped_column(Text)
    ata_code: Mapped[str | None] = mapped_column(Text, index=True)
    ata_description: Mapped[str | None] = mapped_column(Text)
    segment: Mapped[str | None] = mapped_column(Text)
    component_name: Mapped[str | None] = mapped_column(Text)
    part_name: Mapped[str | None] = mapped_column(Text)
    part_number: Mapped[str | None] = mapped_column(Text)
    defect_description: Mapped[str | None] = mapped_column(Text)
    narrative: Mapped[str | None] = mapped_column(Text)
    raw_json: Mapped[dict | None] = mapped_column(JSON)
    source_file: Mapped[str | None] = mapped_column(Text)
    source_refreshed_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())


class AirworthinessDirective(Base):
    __tablename__ = "airworthiness_directives"

    id: Mapped[int] = mapped_column(pk_type(), primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    document_number: Mapped[str | None] = mapped_column(Text)
    citation: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(Text)
    publication_date: Mapped[object | None] = mapped_column(Date, index=True)
    effective_date: Mapped[object | None] = mapped_column(Date)
    manufacturer: Mapped[str | None] = mapped_column(Text, index=True)
    model_terms: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    unsafe_condition: Mapped[str | None] = mapped_column(Text)
    federal_register_url: Mapped[str | None] = mapped_column(Text)
    raw_json: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())


class AircraftProfileCache(Base):
    __tablename__ = "aircraft_profile_cache"

    n_number: Mapped[str] = mapped_column(Text, primary_key=True)
    profile_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    generated_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    expires_at: Mapped[object | None] = mapped_column(DateTime)


class SourceRefreshLog(Base):
    __tablename__ = "source_refresh_log"

    id: Mapped[int] = mapped_column(pk_type(), primary_key=True, autoincrement=True)
    source_name: Mapped[str] = mapped_column(Text, nullable=False)
    source_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    started_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    finished_at: Mapped[object | None] = mapped_column(DateTime)
    rows_downloaded: Mapped[int | None] = mapped_column(Integer)
    rows_inserted: Mapped[int | None] = mapped_column(Integer)
    rows_failed: Mapped[int | None] = mapped_column(Integer)
    error_message: Mapped[str | None] = mapped_column(Text)
