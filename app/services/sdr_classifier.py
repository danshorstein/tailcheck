from __future__ import annotations

import hashlib
import re
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

from app.services.signal_engine import STANDARD_LIMITATIONS

SAFETY_RELEVANCE_VALUES = ["low", "moderate", "potential", "high_concern", "unknown"]
SEVERITY_BAND_VALUES = ["routine", "serviceability", "notable", "high_concern", "unknown"]
OPERATIONAL_IMPACT_VALUES = [
    "routine_maintenance",
    "serviceability",
    "dispatch_relevance",
    "takeoff_landing_relevance",
    "takeoff_interruption",
    "in_flight_relevance",
    "unknown",
]
RESOLUTION_STATUS_VALUES = [
    "corrective_action_recorded",
    "inspected_no_fault_found",
    "deferred_or_followup_required",
    "resolution_unclear",
]
PUBLIC_RECORD_SIGNAL_VALUES = ["none_found", "low", "moderate", "elevated", "notable"]

ATA_GROUPS = {
    "21": "Air conditioning / pressurization",
    "22": "Auto flight",
    "23": "Communications",
    "24": "Electrical power",
    "25": "Cabin / equipment / furnishings",
    "26": "Fire protection",
    "27": "Flight controls",
    "28": "Fuel",
    "29": "Hydraulic power",
    "30": "Ice / rain protection",
    "31": "Instruments",
    "32": "Landing gear / brakes",
    "33": "Lighting",
    "34": "Navigation",
    "36": "Pneumatic / bleed air",
    "49": "APU",
    "52": "Doors",
    "53": "Fuselage",
    "54": "Nacelles / pylons",
    "55": "Stabilizers",
    "56": "Windows",
    "57": "Wings",
    "71": "Powerplant",
    "72": "Engine",
    "73": "Engine fuel and control",
    "74": "Ignition",
    "75": "Engine air",
    "76": "Engine controls",
    "77": "Engine indicating",
    "78": "Exhaust",
    "79": "Oil",
    "80": "Starting",
}

ATA_SYSTEM_CATEGORIES = {
    "21": "environmental",
    "22": "auto_flight",
    "23": "communications",
    "24": "electrical_power",
    "25": "cabin_equipment",
    "26": "fire_protection",
    "27": "flight_controls",
    "28": "fuel",
    "29": "hydraulic_power",
    "30": "ice_rain_protection",
    "31": "instruments",
    "32": "landing_gear_brakes",
    "33": "lighting",
    "34": "navigation",
    "36": "pneumatic_bleed_air",
    "49": "apu",
    "52": "doors",
    "53": "fuselage_structure",
    "54": "nacelles_pylons",
    "55": "stabilizers",
    "56": "windows",
    "57": "wings_structure",
    "71": "powerplant",
    "72": "engine",
    "73": "engine_fuel_control",
    "74": "ignition",
    "75": "engine_air",
    "76": "engine_controls",
    "77": "engine_indicating",
    "78": "exhaust",
    "79": "oil",
    "80": "starting",
}

NOTABLE_EVENT_FLAGS = {
    "rejected_takeoff",
    "fire_or_overheat_indication",
    "smoke_or_fumes",
    "crack_or_structural_damage",
    "brake_or_directional_control",
}

CRITICAL_SYSTEM_CATEGORIES = {
    "engine",
    "engine_air",
    "engine_controls",
    "engine_fuel_control",
    "engine_indicating",
    "exhaust",
    "fire_protection",
    "flight_controls",
    "fuel",
    "fuselage_structure",
    "hydraulic_power",
    "landing_gear_brakes",
    "nacelles_pylons",
    "oil",
    "pneumatic_bleed_air",
    "powerplant",
    "starting",
    "stabilizers",
    "wings_structure",
}


@dataclass(frozen=True)
class SDRSourceRecord:
    source_year: int | None
    report_date: Any
    occurrence_date: Any
    n_number: str | None
    ata_code: str | None
    ata_description: str | None
    component_name: str | None
    part_name: str | None
    defect_description: str | None
    narrative: str | None
    source_file: str | None


def _text(*values: str | None) -> str:
    return " ".join(str(v) for v in values if v).upper()


def _has(text: str, *patterns: str) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)


def ata_chapter(ata_code: str | None) -> str | None:
    if not ata_code:
        return None
    match = re.search(r"\d{2}", str(ata_code))
    return match.group(0) if match else None


def stable_record_id(record: SDRSourceRecord) -> str:
    fields = [
        record.source_file,
        record.n_number,
        _iso(record.report_date),
        _iso(record.occurrence_date),
        record.ata_code,
        record.part_name,
        record.component_name,
        record.narrative,
    ]
    payload = "|".join(str(field or "") for field in fields)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:20]


def _iso(value: Any) -> str | None:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return str(value) if value is not None else None


def system_category_for(record: SDRSourceRecord, chapter: str | None, combined_text: str) -> str:
    category = ATA_SYSTEM_CATEGORIES.get(chapter or "", "unknown")
    if _has(combined_text, r"\bPRSOV\b", r"\bBLEED\b", r"PNEUMATIC"):
        return "pneumatic_bleed_air"
    if _has(combined_text, r"\bBRAKE\b", r"\bWHEEL\b", r"\bTIRE\b", r"ANTI[- ]?SKID", r"DIRECTIONAL CONTROL"):
        return "landing_gear_brakes"
    if _has(combined_text, r"\bDOOR\b", r"\bLATCH\b", r"PLUG DOOR", r"GIRT BAR", r"SLIDE BUSTLE"):
        return "doors"
    if _has(combined_text, r"\bENGINE\b", r"\bENG\b", r"\bEEC\b", r"\bEIU\b"):
        return "engine" if category == "unknown" else category
    if _has(combined_text, r"EMERGENCY LIGHT", r"PATHWAY LIGHT", r"EXIT LIGHT"):
        return "emergency_equipment"
    return category


def event_flags_for(record: SDRSourceRecord, chapter: str | None, category: str, combined_text: str) -> list[str]:
    flags: list[str] = []
    if _has(combined_text, r"REJECTED TAKEOFF", r"\bRTO\b"):
        flags.append("rejected_takeoff")
    if _has(combined_text, r"\bFIRE\b", r"OVERHEAT"):
        flags.append("fire_or_overheat_indication")
    if _has(combined_text, r"\bSMOKE\b", r"\bFUME", r"\bFUMES\b", r"\bBURNED\b", r"\bBURNING\b", r"ELECTRICAL SMELL", r"\bODOR\b", r"\bODOUR\b"):
        flags.append("smoke_or_fumes")
    if _has(combined_text, r"\bCRACK", r"FRACTURE", r"STRUCTURAL", r"\bCORRODED\b"):
        flags.append("crack_or_structural_damage")
    if _has(combined_text, r"\bLEAK", r"\bLEAKING\b"):
        flags.append("leak")
    if chapter == "32" or _has(combined_text, r"\bBRAKE\b", r"\bWHEEL\b", r"\bTIRE\b", r"ANTI[- ]?SKID", r"DIRECTIONAL CONTROL", r"PULLED LEFT", r"PULLED RIGHT"):
        flags.append("brake_or_directional_control")
    if (chapter == "33" and _has(combined_text, r"EMERGENCY", r"PATHWAY", r"EXIT")) or _has(combined_text, r"EMERGENCY LIGHT", r"PATHWAY LIGHT", r"EXIT LIGHT"):
        flags.append("emergency_equipment")
    if chapter == "52" or _has(combined_text, r"\bDOOR\b", r"\bLATCH\b", r"PLUG DOOR", r"GIRT BAR", r"SLIDE"):
        flags.append("door_or_structure")
    if chapter in {"36", "71", "72", "73", "74", "75", "76", "77", "78", "79", "80"} or _has(combined_text, r"\bENGINE\b", r"\bENG\b", r"\bPRSOV\b", r"\bBLEED\b", r"PNEUMATIC"):
        flags.append("engine_or_pneumatic")
    return list(dict.fromkeys(flags))


def operational_impact_for(chapter: str | None, combined_text: str) -> str:
    if _has(combined_text, r"REJECTED TAKEOFF", r"\bRTO\b"):
        return "takeoff_interruption"
    if _has(combined_text, r"\bIN FLIGHT\b", r"DURING FLIGHT", r"FLIGHT RETURNED", r"\bDIVERTED\b"):
        return "in_flight_relevance"
    if chapter == "32" or _has(combined_text, r"\bLANDING\b", r"\bTAKEOFF\b", r"\bBRAKE\b", r"PULLED LEFT", r"PULLED RIGHT", r"\bGEAR\b", r"\bTIRE\b", r"\bWHEEL\b"):
        return "takeoff_landing_relevance"
    if _has(combined_text, r"\bMEL\b", r"\bDEFER", r"\bDEFERRED\b", r"\bDISPATCH\b", r"\bDIP\b", r"WITHIN \d+ FLIGHT CYCLES?"):
        return "dispatch_relevance"
    if _has(combined_text, r"\bINOP\b", r"FAULT", r"FAILED", r"NOTED", r"ILLUMINATED"):
        return "serviceability"
    return "routine_maintenance"


def resolution_status_for(combined_text: str) -> str:
    deferred = _has(combined_text, r"INTERIM REPAIR", r"WITHIN \d+ FLIGHT CYCLES?", r"\bDEFER", r"\bDEFERRED\b", r"\bMEL\b", r"\bDIP ISSUED\b", r"TEMPORARY REPAIR", r"FURTHER TROUBLESHOOTING", r"FOLLOW[- ]?UP")
    corrective = _has(combined_text, r"REMOVED AND REPLACED", r"\bREPLACED\b", r"\bREPAIRED\b", r"\bCLEANED\b", r"\bSPLICED\b", r"OPS CHECK(?:ED)? GOOD", r"OPERATIONAL CHECK(?:ED)? GOOD", r"LEAK CHECK GOOD", r"OK FOR SERVICE")
    inspected = _has(combined_text, r"NO FAULTS? NOTED", r"NO ISSUES? FOUND", r"BITE (?:TEST|CK|CHECK) GOOD", r"\bINSPECTED\b", r"OK TO CONTINUE", r"NO LEAKS? NOTED")
    if deferred:
        return "deferred_or_followup_required"
    if corrective:
        return "corrective_action_recorded"
    if inspected:
        return "inspected_no_fault_found"
    return "resolution_unclear"


def safety_relevance_for(chapter: str | None, category: str, flags: list[str], combined_text: str, resolution_status: str) -> str:
    if category == "unknown":
        base = "unknown"
    elif category in {"cabin_equipment", "communications", "lighting"}:
        base = "low"
    elif category == "emergency_equipment" or "emergency_equipment" in flags:
        base = "moderate"
    elif category == "landing_gear_brakes":
        base = "potential"
    elif category in CRITICAL_SYSTEM_CATEGORIES:
        base = "potential"
    else:
        base = "moderate"

    if "door_or_structure" in flags and _has(combined_text, r"SLIDE", r"EVACUATION", r"EMERGENCY"):
        base = "potential"
    if any(flag in flags for flag in ["fire_or_overheat_indication", "smoke_or_fumes", "crack_or_structural_damage", "brake_or_directional_control"]):
        if base in {"low", "moderate", "unknown"}:
            base = "potential"
    if _has(combined_text, r"EMERGENCY DECLARED", r"ENGINE SHUT(?:DOWN)?", r"\bSHUT DOWN\b", r"FLIGHT CONTROL FAILURE", r"SEVERE STRUCTURAL", r"UNRESOLVED"):
        return "high_concern"
    if "rejected_takeoff" in flags and "fire_or_overheat_indication" in flags:
        return "high_concern"
    if "smoke_or_fumes" in flags and resolution_status in {"deferred_or_followup_required", "resolution_unclear"}:
        return "high_concern"
    return base


def severity_band_for(safety_relevance: str, impact: str, flags: list[str]) -> str:
    if safety_relevance == "high_concern":
        return "high_concern"
    if impact in {"takeoff_interruption", "in_flight_relevance"} or any(flag in flags for flag in NOTABLE_EVENT_FLAGS):
        return "notable"
    if safety_relevance in {"moderate", "potential"} or impact in {"serviceability", "dispatch_relevance", "takeoff_landing_relevance"}:
        return "serviceability"
    if safety_relevance == "unknown":
        return "unknown"
    return "routine"


def display_chips_for(chapter: str | None, category: str, safety_relevance: str, impact: str, flags: list[str]) -> list[str]:
    chips = []
    if chapter and chapter in ATA_GROUPS:
        chips.append(ATA_GROUPS[chapter])
    if safety_relevance == "high_concern":
        chips.append("High-concern public record")
    elif safety_relevance == "potential":
        chips.append("Potential safety relevance")
    elif safety_relevance == "moderate":
        chips.append("Moderate relevance")
    if impact == "takeoff_interruption":
        chips.append("Takeoff interrupted")
    elif impact == "in_flight_relevance":
        chips.append("In-flight relevance")
    elif impact == "dispatch_relevance":
        chips.append("Dispatch relevance")
    flag_labels = {
        "fire_or_overheat_indication": "Fire/overheat indication",
        "smoke_or_fumes": "Smoke/fumes",
        "crack_or_structural_damage": "Crack/structural note",
        "leak": "Leak",
        "brake_or_directional_control": "Brake/directional control",
        "emergency_equipment": "Emergency equipment",
        "repeat_category_member": "Repeated category",
    }
    for flag in flags:
        if flag in flag_labels:
            chips.append(flag_labels[flag])
    return list(dict.fromkeys(chips))[:6]


def user_facing_summary_for(record: SDRSourceRecord, ata_group: str, safety_relevance: str, impact: str, flags: list[str]) -> str:
    date_part = _iso(record.report_date) or "An SDR record"
    part = record.part_name or record.component_name or "component"
    group = ata_group or "aircraft system"
    if "rejected_takeoff" in flags:
        return f"{date_part}: SDR notes a rejected takeoff involving {part} in the {group} area."
    if "fire_or_overheat_indication" in flags:
        return f"{date_part}: SDR notes a fire or overheat indication involving {part} in the {group} area."
    if "smoke_or_fumes" in flags:
        return f"{date_part}: SDR notes smoke, fumes, odor, or related cabin/aircraft indication involving {part}."
    if "crack_or_structural_damage" in flags:
        return f"{date_part}: SDR notes a crack, corrosion, or structural damage item involving {part}."
    if "leak" in flags:
        return f"{date_part}: SDR notes a leak-related item involving {part} in the {group} area."
    if impact == "dispatch_relevance":
        return f"{date_part}: SDR notes a dispatch or follow-up maintenance item involving {part}."
    if safety_relevance in {"potential", "moderate"}:
        return f"{date_part}: SDR notes a public maintenance difficulty record involving {part} in the {group} area."
    return f"{date_part}: SDR notes a routine or serviceability-related public maintenance record involving {part}."


def classify_sdr_record(record: SDRSourceRecord) -> dict:
    chapter = ata_chapter(record.ata_code)
    group = ATA_GROUPS.get(chapter or "", "Unknown")
    combined = _text(record.ata_code, record.ata_description, record.component_name, record.part_name, record.defect_description, record.narrative)
    category = system_category_for(record, chapter, combined)
    flags = event_flags_for(record, chapter, category, combined)
    impact = operational_impact_for(chapter, combined)
    resolution = resolution_status_for(combined)
    relevance = safety_relevance_for(chapter, category, flags, combined, resolution)
    severity = severity_band_for(relevance, impact, flags)
    return {
        "record_id": stable_record_id(record),
        "ata_chapter": chapter,
        "ata_group": group,
        "system_category": category,
        "safety_relevance": relevance,
        "severity_band": severity,
        "operational_impact": impact,
        "resolution_status": resolution,
        "event_flags": flags,
        "display_chips": display_chips_for(chapter, category, relevance, impact, flags),
        "user_facing_summary": user_facing_summary_for(record, group, relevance, impact, flags),
        "raw_narrative": record.narrative,
    }


def enrich_sdr_records(records: list[SDRSourceRecord]) -> list[dict]:
    enriched = [classify_sdr_record(record) for record in records]
    repeated_categories = {
        category
        for category, count in Counter(item["system_category"] for item in enriched).items()
        if category != "unknown" and count >= 3
    }
    for item in enriched:
        if item["system_category"] in repeated_categories:
            item["event_flags"] = list(dict.fromkeys([*item["event_flags"], "repeat_category_member"]))
            item["display_chips"] = list(dict.fromkeys([*item["display_chips"], "Repeated category"]))[:6]
    return enriched


def public_record_summary(ntsb_records: list[dict], enriched_sdr_records: list[dict], recent_sdr_records_found: int) -> dict:
    relevance_counts = Counter(item["safety_relevance"] for item in enriched_sdr_records)
    severity_counts = Counter(item["severity_band"] for item in enriched_sdr_records)
    system_counts = Counter(item["system_category"] for item in enriched_sdr_records)
    repeated = [
        {"system_category": category, "records_found": count}
        for category, count in sorted(system_counts.items())
        if category != "unknown" and count >= 3
    ]
    notable = [
        item
        for item in enriched_sdr_records
        if any(flag in NOTABLE_EVENT_FLAGS for flag in item["event_flags"])
    ]
    high_concern_count = relevance_counts.get("high_concern", 0)
    potential_count = relevance_counts.get("potential", 0)
    sdr_count = len(enriched_sdr_records)
    ntsb_count = len(ntsb_records)
    notable_event_flag_count = sum(
        1 for item in enriched_sdr_records if any(flag in NOTABLE_EVENT_FLAGS for flag in item["event_flags"])
    )

    if ntsb_count or high_concern_count or notable_event_flag_count >= 2:
        signal = "notable"
    elif sdr_count >= 8 or repeated or potential_count:
        signal = "elevated"
    elif 3 <= sdr_count <= 7 or relevance_counts.get("moderate", 0):
        signal = "moderate"
    elif 1 <= sdr_count <= 2 and not potential_count and not high_concern_count and not notable:
        signal = "low"
    else:
        signal = "none_found"

    labels = {
        "none_found": "No NTSB or SDR public records found",
        "low": "Limited public maintenance records found",
        "moderate": "Some public records found",
        "elevated": "Elevated public-records signal",
        "notable": "Notable public-records signal",
    }
    factor = "No NTSB or SDR records found"
    if ntsb_count:
        factor = "NTSB accident/incident public record found"
    elif high_concern_count:
        factor = "High-concern SDR classification present"
    elif notable_event_flag_count >= 2:
        factor = "Multiple notable SDR event flags"
    elif potential_count:
        factor = "Potential safety-relevance SDR record found"
    elif repeated:
        factor = f"Repeated {repeated[0]['system_category']} records"
    elif sdr_count:
        factor = f"{sdr_count} SDR public record{'s' if sdr_count != 1 else ''} found"

    return {
        "public_record_signal": signal,
        "profile_summary_label": labels[signal],
        "most_notable_factor": factor,
        "ntsb_records_found": ntsb_count,
        "sdr_records_found": sdr_count,
        "recent_sdr_records_found": recent_sdr_records_found,
        "safety_relevance_breakdown": {value: relevance_counts.get(value, 0) for value in SAFETY_RELEVANCE_VALUES},
        "severity_band_breakdown": {value: severity_counts.get(value, 0) for value in SEVERITY_BAND_VALUES},
        "system_breakdown": dict(sorted(system_counts.items())),
        "repeated_category_patterns": repeated,
        "notable_events": notable,
        "limitations": STANDARD_LIMITATIONS,
        "disclaimer": "Public records only — not a complete maintenance history or FAA airworthiness determination.",
    }


FRONTEND_ENUMS = {
    "safety_relevance": SAFETY_RELEVANCE_VALUES,
    "severity_band": SEVERITY_BAND_VALUES,
    "operational_impact": OPERATIONAL_IMPACT_VALUES,
    "resolution_status": RESOLUTION_STATUS_VALUES,
    "public_record_signal": PUBLIC_RECORD_SIGNAL_VALUES,
}
