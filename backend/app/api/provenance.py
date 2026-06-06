from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ProvenanceResponse
from app.services import qbittorrent_client

router = APIRouter()


@router.get("/provenance", response_model=ProvenanceResponse)
async def provenance(path: str, db: Session = Depends(get_db)):
    torrent = await qbittorrent_client.find_torrent_by_path(path, db)
    if not torrent:
        return ProvenanceResponse(tracker=None)
    tracker = await qbittorrent_client.get_tracker(torrent["hash"], db)
    return ProvenanceResponse(tracker=tracker)
