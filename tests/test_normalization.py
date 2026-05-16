from __future__ import annotations

from datetime import date

from app.services.normalization import display_n_number, normalize_n_number, normalize_text_key, parse_date


def test_normalize_n_number_variants():
    assert normalize_n_number("N123AB") == "123AB"
    assert normalize_n_number("123AB") == "123AB"
    assert normalize_n_number(" n-123ab ") == "123AB"
    assert normalize_n_number("") is None
    assert display_n_number("123AB") == "N123AB"


def test_parse_date_variants():
    assert parse_date("20250131") == date(2025, 1, 31)
    assert parse_date("01/31/2025") == date(2025, 1, 31)
    assert parse_date("2025-01-31") == date(2025, 1, 31)
    assert parse_date("00000000") is None


def test_normalize_text_key():
    assert normalize_text_key(" Cessna Aircraft Co. ") == "CESSNA AIRCRAFT CO"
