from __future__ import annotations

from app.db.models import AircraftReference, AircraftRegistry


def test_profile_endpoint_returns_envelope(client, db_session):
    db_session.add(
        AircraftRegistry(
            n_number="100",
            n_number_display="N100",
            serial_number="100SER",
            mfr_mdl_code="B350",
            status_code="V",
        )
    )
    db_session.add(
        AircraftReference(mfr_mdl_code="B350", manufacturer="BEECH", model="B300")
    )
    db_session.commit()

    response = client.get("/api/v1/aircraft/N100/profile")

    assert response.status_code == 200
    data = response.json()
    assert data["n_number"] == "N100"
    assert data["identity"]["matched"] is True
    assert data["ntsb"]["records_found"] == 0
    assert data["sdr"]["records_found"] == 0
    assert data["signal_summary"]["label"] == "No major public records found"
