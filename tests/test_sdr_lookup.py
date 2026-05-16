from __future__ import annotations

from app.db.models import FAASDRReport


def test_sdr_lookup_by_n_number(seeded_db):
    rows = seeded_db.query(FAASDRReport).filter(FAASDRReport.n_number == "123AB").all()

    assert len(rows) == 1
    assert rows[0].ata_code == "2710"
