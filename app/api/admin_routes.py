from __future__ import annotations

import os

from fastapi import APIRouter, Header, HTTPException

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


def require_admin_token(x_admin_token: str | None = Header(default=None)) -> None:
    configured = os.getenv("ADMIN_TOKEN")
    if configured and configured != "change-me" and x_admin_token != configured:
        raise HTTPException(status_code=401, detail="Invalid admin token")


@router.post("/refresh/faa-registry")
def refresh_faa_registry() -> dict:
    return {
        "status": "not_implemented",
        "message": "Run scripts/ingest_faa_registry.py for the current local pipeline.",
    }


@router.post("/refresh/sdr")
def refresh_sdr(start_year: int = 2022, end_year: int = 2026) -> dict:
    return {
        "status": "not_implemented",
        "start_year": start_year,
        "end_year": end_year,
        "message": "Run scripts/ingest_faa_sdr.py for the current local pipeline.",
    }


@router.post("/refresh/ntsb")
def refresh_ntsb() -> dict:
    return {
        "status": "not_implemented",
        "message": "Run scripts/extract_ntsb_mdb.sh, then scripts/ingest_ntsb_bulk_mdb.py.",
    }
