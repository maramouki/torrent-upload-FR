from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import DuplicateCheckResponse
from app.services import c411_client
from app.services.file_service import extract_quality_slot

router = APIRouter()


@router.get("/duplicate-check", response_model=DuplicateCheckResponse)
async def duplicate_check(path: str, tag: str = "", db: Session = Depends(get_db)):
    name = Path(path).name
    title = name.split(".")[0] if "." in name else name
    slot = extract_quality_slot(name)
    result = await c411_client.check_duplicate(title, slot, db)
    return DuplicateCheckResponse(
        duplicate=result.get("duplicate", False),
        existing=result.get("existing"),
    )
