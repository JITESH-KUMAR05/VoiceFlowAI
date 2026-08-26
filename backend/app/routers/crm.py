"""Reading leads back out of Salesforce."""

from __future__ import annotations

import logging
from typing import Any

from anyio import to_thread
from fastapi import APIRouter, Depends, Query

from app.services.container import Services, get_services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/crm", tags=["crm"])


@router.get("/leads")
async def get_crm_leads(
    agent_type: str = Query(default="all", max_length=40),
    services: Services = Depends(get_services),
) -> list[dict[str, Any]]:
    """Leads this agent created, newest first.

    Returns an empty list when Salesforce is unconfigured or unreachable. The
    frontend renders that as an empty state; failing the request would make a
    missing integration look like a broken page.
    """
    return await to_thread.run_sync(services.salesforce.get_crm_data, agent_type)
