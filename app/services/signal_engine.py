from __future__ import annotations

from datetime import date, timedelta


STANDARD_LIMITATIONS = [
    "This profile uses public datasets searched by this service.",
    "It is not a complete maintenance history.",
    "It is not an FAA airworthiness determination.",
    "No public records found does not mean no events, defects, or maintenance issues exist.",
    "Tail numbers can be reassigned; serial-number matching should be used when possible.",
]


def compute_signal_summary(registry, ntsb_records, sdr_records, ad_records):
    warnings = [
        "This profile is based only on public datasets searched by this service.",
        "It is not a complete maintenance history or airworthiness determination.",
    ]

    if not registry:
        return {
            "label": "Incomplete / ambiguous data",
            "confidence": "Low",
            "warnings": warnings + ["No FAA registry match found."],
        }

    recent_cutoff = date.today() - timedelta(days=5 * 365)
    recent_sdrs = [
        r for r in sdr_records if r.report_date and r.report_date >= recent_cutoff
    ]
    severe_ntsb = [
        r
        for r in ntsb_records
        if (getattr(r, "aircraft_damage", None) or "").upper()
        in ["DESTROYED", "SUBSTANTIAL", "DEST", "SUBS"]
    ]

    critical_ata_prefixes = {
        "21",
        "22",
        "24",
        "26",
        "27",
        "28",
        "29",
        "32",
        "34",
        "49",
        "71",
        "72",
        "73",
        "74",
        "75",
        "76",
        "77",
        "78",
        "79",
        "80",
    }
    critical_sdrs = [
        r for r in sdr_records if ((r.ata_code or "")[:2] in critical_ata_prefixes)
    ]

    if severe_ntsb:
        label = "Elevated public-records signal"
    elif len(recent_sdrs) >= 5 or len(critical_sdrs) >= 3:
        label = "Elevated public-records signal"
    elif ntsb_records or sdr_records or ad_records:
        label = "Some public records found"
    else:
        label = "No major public records found"

    confidence = "High" if registry and registry.serial_number else "Medium"

    return {
        "label": label,
        "confidence": confidence,
        "counts": {
            "ntsb_records": len(ntsb_records),
            "sdr_records": len(sdr_records),
            "recent_sdr_records": len(recent_sdrs),
            "model_level_ad_records": len(ad_records),
        },
        "warnings": warnings,
    }
