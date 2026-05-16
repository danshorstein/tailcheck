from __future__ import annotations

from app.services.profile_service import build_aircraft_profile


def test_profile_service_returns_complete_profile(seeded_db):
    profile = build_aircraft_profile(seeded_db, "N123AB", use_cache=False)

    assert profile["n_number"] == "N123AB"
    assert profile["identity"]["matched"] is True
    assert profile["identity"]["manufacturer"] == "CESSNA"
    assert profile["ntsb"]["records_found"] == 1
    assert profile["sdr"]["records_found"] == 1
    assert profile["sdr"]["recent_records_found"] == 1
    assert profile["airworthiness_directives"]["model_level_records_found"] == 1
    assert profile["signal_summary"]["label"] == "Some public records found"
    assert profile["summary"]["public_record_signal"] == "notable"
    assert profile["summary"]["ntsb_records_found"] == 1
    assert profile["sdr"]["records"][0]["record_id"]
    assert profile["sdr"]["records"][0]["raw_narrative"] is None
    assert "It is not an FAA airworthiness determination." in profile["limitations"]


def test_profile_service_handles_missing_registry(db_session):
    profile = build_aircraft_profile(db_session, "N000ZZ", use_cache=False)

    assert profile["n_number"] == "N000ZZ"
    assert profile["identity"]["matched"] is False
    assert profile["signal_summary"]["label"] == "Incomplete / ambiguous data"
    assert profile["summary"]["public_record_signal"] == "none_found"
    assert profile["ntsb"]["records_found"] == 0
    assert profile["sdr"]["records_found"] == 0
