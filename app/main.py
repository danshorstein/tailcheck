from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import admin_routes, aircraft_routes
from app.db.connection import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Aircraft Public Records API",
    description="Public-records aircraft profile service. Not an airworthiness determination.",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
def health() -> dict:
    return {"ok": True}


app.include_router(aircraft_routes.router)
app.include_router(admin_routes.router)
