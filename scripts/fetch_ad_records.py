from __future__ import annotations

from urllib.parse import urlencode

import requests

from app.db.connection import SessionLocal, init_db
from app.db.models import AirworthinessDirective
from app.services.normalization import parse_date

FEDREG_BASE = "https://www.federalregister.gov/api/v1/documents.json"


def search_airworthiness_directives(manufacturer: str, model: str, per_page: int = 20):
    term = f"Airworthiness Directives {manufacturer} {model}"
    params = {
        "conditions[agencies][]": "federal-aviation-administration",
        "conditions[type][]": "RULE",
        "conditions[term]": term,
        "per_page": per_page,
        "order": "newest",
    }
    resp = requests.get(FEDREG_BASE, params=params, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return data.get("results", [])


def cache_airworthiness_directives(manufacturer: str, model: str) -> int:
    records = search_airworthiness_directives(manufacturer, model)
    with SessionLocal() as db:
        for rec in records:
            document_number = rec.get("document_number")
            existing = (
                db.query(AirworthinessDirective)
                .filter(AirworthinessDirective.document_number == document_number)
                .first()
                if document_number
                else None
            )
            target = existing or AirworthinessDirective(source="Federal Register")
            target.document_number = document_number
            target.citation = rec.get("citation")
            target.title = rec.get("title")
            target.publication_date = parse_date(rec.get("publication_date"))
            target.effective_date = parse_date(rec.get("effective_on"))
            target.manufacturer = manufacturer
            target.model_terms = model
            target.summary = rec.get("abstract")
            target.federal_register_url = rec.get("html_url")
            target.raw_json = rec
            if not existing:
                db.add(target)
        db.commit()
    return len(records)


def main() -> None:
    init_db()
    for rec in search_airworthiness_directives("Cessna", "172")[:5]:
        print(rec.get("publication_date"), rec.get("title"), rec.get("html_url"))


if __name__ == "__main__":
    main()
