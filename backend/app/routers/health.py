"""Health and configuration status."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.models.schemas import HealthResponse, ProviderStatus
from app.services.container import Services, get_services

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(services: Services = Depends(get_services)) -> HealthResponse:
    """Report which optional providers this deployment has credentials for.

    Useful when a demo behaves differently than expected: it distinguishes
    "Salesforce sync is broken" from "Salesforce was never configured here".
    """
    return HealthResponse(
        status="ok",
        providers=ProviderStatus(
            twilio=services.twilio is not None,
            salesforce=bool(getattr(services.salesforce, "enabled", False)),
            email=bool(getattr(services.email, "enabled", False)),
        ),
        active_sessions=services.sessions.active_sessions,
    )
