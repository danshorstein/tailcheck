from __future__ import annotations

from app.db.models import AircraftRegistry
from app.services.normalization import normalize_n_number


def test_registry_lookup_by_normalized_n_number(seeded_db):
    n_number = normalize_n_number("n-123ab")
    record = (
        seeded_db.query(AircraftRegistry)
        .filter(AircraftRegistry.n_number == n_number)
        .first()
    )

    assert record is not None
    assert record.n_number_display == "N123AB"
    assert record.serial_number == "SER123"
