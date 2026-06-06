from fastapi import APIRouter

from app.schemas import ProvenanceResponse
from app.services.qbittorrent_client import qbittorrent_client

router = APIRouter()


@router.get("/provenance", response_model=ProvenanceResponse)
async def provenance(path: str):
    torrent = await qbittorrent_client.find_torrent_by_path(path)
    if not torrent:
        return ProvenanceResponse(tracker=None)
    tracker = await qbittorrent_client.get_tracker(torrent["hash"])
    return ProvenanceResponse(tracker=tracker)
