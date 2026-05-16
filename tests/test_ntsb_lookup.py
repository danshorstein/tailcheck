from __future__ import annotations

from app.db.models import NTSBAircraft


def test_ntsb_lookup_by_n_number(seeded_db):
    rows = seeded_db.query(NTSBAircraft).filter(NTSBAircraft.n_number == "123AB").all()

    assert len(rows) == 1
    assert rows[0].event_id == "EVT1"
