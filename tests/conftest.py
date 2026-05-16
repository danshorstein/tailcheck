from __future__ import annotations

import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.connection import Base, get_db
from app.db.models import (
    AirworthinessDirective,
    AircraftReference,
    AircraftRegistry,
    FAASDRReport,
    NTSBAircraft,
    NTSBEvent,
)
from app.main import app


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def seeded_db(db_session):
    db_session.add(
        AircraftRegistry(
            n_number="123AB",
            n_number_display="N123AB",
            serial_number="SER123",
            mfr_mdl_code="C172",
            status_code="V",
            cert_issue_date=date(2024, 1, 2),
            expiration_date=date(2027, 1, 31),
        )
    )
    db_session.add(
        AircraftReference(
            mfr_mdl_code="C172",
            manufacturer="CESSNA",
            model="172",
            number_engines="1",
            number_seats="4",
        )
    )
    db_session.add(
        FAASDRReport(
            source_year=2025,
            report_date=date(2025, 3, 1),
            n_number="123AB",
            ata_code="2710",
            defect_description="Control cable wear found during inspection",
            source_file="SDR-2025.csv",
        )
    )
    db_session.add(
        NTSBEvent(
            event_id="EVT1",
            event_date=date(2022, 6, 1),
            location_city="Austin",
            location_state="TX",
            injury_severity="None",
            report_status="Final",
        )
    )
    db_session.add(
        NTSBAircraft(
            event_id="EVT1",
            n_number="123AB",
            serial_number="SER123",
            aircraft_damage="Minor",
            registration_number_raw="N123AB",
        )
    )
    db_session.add(
        AirworthinessDirective(
            source="Federal Register",
            document_number="2025-001",
            title="Airworthiness Directives; Cessna 172 Airplanes",
            publication_date=date(2025, 1, 15),
            manufacturer="CESSNA",
            model_terms="172",
            federal_register_url="https://www.federalregister.gov/example",
        )
    )
    db_session.commit()
    return db_session


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
