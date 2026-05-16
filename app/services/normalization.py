from __future__ import annotations

import re
from datetime import date, datetime

import pandas as pd


def normalize_n_number(value: str | None) -> str | None:
    """
    Converts N123AB, 123AB, n-123ab, and whitespace variants to internal key: 123AB.
    Returns None when input is empty or not parseable.
    """
    if value is None:
        return None
    v = str(value).upper().strip()
    if v in ["", "NAN"]:
        return None
    v = re.sub(r"[^A-Z0-9]", "", v)
    if v.startswith("N"):
        v = v[1:]
    return v or None


def display_n_number(value: str | None) -> str | None:
    n = normalize_n_number(value)
    return f"N{n}" if n else None


def parse_date(value) -> date | None:
    if value is None or str(value).strip() in ["", "nan", "NaN", "0", "00000000"]:
        return None
    s = str(value).strip()
    for fmt in ["%Y%m%d", "%m/%d/%Y", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S"]:
        try:
            return datetime.strptime(s[:19], fmt).date()
        except ValueError:
            pass
    try:
        parsed = pd.to_datetime(s, errors="coerce")
        return None if pd.isna(parsed) else parsed.date()
    except Exception:
        return None


def normalize_text_key(value: str | None) -> str | None:
    if not value:
        return None
    v = value.upper().strip()
    v = re.sub(r"[^A-Z0-9]+", " ", v)
    return re.sub(r"\s+", " ", v).strip()


def clean_column_name(value: str) -> str:
    return (
        value.replace("\ufeff", "")
        .replace("ï»¿", "")
        .strip()
        .lower()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("-", "_")
    )


def clean_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [clean_column_name(c) for c in df.columns]
    return df
