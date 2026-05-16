from __future__ import annotations

from datetime import date

from app.services.sdr_classifier import (
    SDRSourceRecord,
    classify_sdr_record,
    enrich_sdr_records,
    public_record_summary,
)


def make_record(**overrides):
    values = {
        "source_year": 2025,
        "report_date": date(2025, 5, 30),
        "occurrence_date": date(2025, 6, 2),
        "n_number": "62849",
        "ata_code": "7500",
        "ata_description": None,
        "component_name": None,
        "part_name": "SHUTOFF VALVE",
        "defect_description": None,
        "narrative": "REJECTED TAKEOFF DUE TO MOMENTARY FIRE/OVERHEAT INDICATION. REMOVED AND REPLACED ENG #1 PRSOV. OPS AND LEAK CHECK GOOD.",
        "source_file": "SDR-2025.csv",
    }
    values.update(overrides)
    return SDRSourceRecord(**values)


def test_rejected_takeoff_fire_overheat_classifies_high_concern():
    classified = classify_sdr_record(make_record())

    assert classified["ata_chapter"] == "75"
    assert classified["system_category"] == "pneumatic_bleed_air"
    assert classified["safety_relevance"] == "high_concern"
    assert classified["severity_band"] == "high_concern"
    assert classified["operational_impact"] == "takeoff_interruption"
    assert classified["resolution_status"] == "corrective_action_recorded"
    assert "rejected_takeoff" in classified["event_flags"]
    assert "fire_or_overheat_indication" in classified["event_flags"]
    assert classified["raw_narrative"] == make_record().narrative


def test_emergency_lighting_classifies_moderate_serviceability():
    classified = classify_sdr_record(
        make_record(
            ata_code="3350",
            part_name="LIGHT",
            narrative="AISLE EMERGENCY EXIT LIGHT AT SEAT 28C IS INOP. REPLACED LIGHT. OPS CHECK GOOD.",
        )
    )

    assert classified["system_category"] == "emergency_equipment"
    assert classified["safety_relevance"] == "moderate"
    assert classified["severity_band"] == "serviceability"
    assert "emergency_equipment" in classified["event_flags"]


def test_repeated_category_members_get_repeat_flag():
    records = [
        make_record(ata_code="3200", part_name="BRAKE", narrative=f"BRAKE ITEM {idx}. REPLACED. OPS CHECK GOOD.")
        for idx in range(3)
    ]

    enriched = enrich_sdr_records(records)

    assert all("repeat_category_member" in item["event_flags"] for item in enriched)
    assert all(item["system_category"] == "landing_gear_brakes" for item in enriched)


def test_aircraft_level_summary_uses_notable_signal_for_high_concern():
    enriched = enrich_sdr_records([make_record()])
    summary = public_record_summary([], enriched, recent_sdr_records_found=1)

    assert summary["public_record_signal"] == "notable"
    assert summary["sdr_records_found"] == 1
    assert summary["safety_relevance_breakdown"]["high_concern"] == 1
    assert summary["most_notable_factor"] == "High-concern SDR classification present"
    assert summary["disclaimer"] == "Public records only — not a complete maintenance history or FAA airworthiness determination."
