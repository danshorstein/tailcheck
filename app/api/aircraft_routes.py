from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.services.profile_service import build_aircraft_profile, build_raw_aircraft_records

router = APIRouter(prefix="/api/v1/aircraft", tags=["aircraft"])


@router.get("/{n_number}/profile")
def aircraft_profile(n_number: str, db: Session = Depends(get_db)):
    return build_aircraft_profile(db, n_number)


@router.get("/{n_number}/raw")
def aircraft_raw(n_number: str, db: Session = Depends(get_db)):
    return build_raw_aircraft_records(db, n_number)
