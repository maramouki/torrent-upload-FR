from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import TagSuggestion
from app.schemas import TagDetectResponse, TagSuggestResponse
from app.services.file_service import detect_tag

router = APIRouter()


@router.get("/tags/detect", response_model=TagDetectResponse)
def tags_detect(path: str):
    name = Path(path).name
    return TagDetectResponse(tag=detect_tag(name))


@router.get("/tags/suggest", response_model=TagSuggestResponse)
def tags_suggest(q: str = "", db: Session = Depends(get_db)):
    query = db.query(TagSuggestion)
    if q:
        query = query.filter(TagSuggestion.tag.ilike(f"{q}%"))
    rows = query.order_by(TagSuggestion.use_count.desc()).limit(10).all()
    return TagSuggestResponse(tags=[r.tag for r in rows])


def upsert_tag(tag: str, db: Session):
    existing = db.query(TagSuggestion).filter(TagSuggestion.tag == tag).first()
    if existing:
        existing.use_count += 1
        existing.last_used = datetime.utcnow()
    else:
        db.add(TagSuggestion(tag=tag, use_count=1, last_used=datetime.utcnow()))
    db.commit()
