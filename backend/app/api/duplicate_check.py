from pathlib import Path

from fastapi import APIRouter

from app.schemas import DuplicateCheckResponse
from app.services.c411_client import c411_client
from app.services.file_service import extract_quality_slot

router = APIRouter()


@router.get("/duplicate-check", response_model=DuplicateCheckResponse)
async def duplicate_check(path: str, tag: str = ""):
    name = Path(path).name
    title = name.split(".")[0] if "." in name else name
    slot = extract_quality_slot(name)
    result = await c411_client.check_duplicate(title, slot)
    return DuplicateCheckResponse(
        duplicate=result.get("duplicate", False),
        existing=result.get("existing"),
    )
