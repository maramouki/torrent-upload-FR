import os
import re
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.schemas import BrowseEntry, BrowseResponse

_poster_cache: dict[str, str | None] = {}

_NON_TITLE_RE = re.compile(
    r'[\.\s]*(19|20)\d{2}.*$'
    r'|[\.\s]*(FRENCH|MULTI|VFF|VOSTFR|MULTi|4K|UHD|2160p|1080p|720p|REMUX|BLURAY|WEB[-.]?DL|WEBRIP|HDTV|BluRay).*$',
    re.IGNORECASE,
)


def _extract_title(folder_name: str) -> str:
    title = _NON_TITLE_RE.sub('', folder_name)
    title = re.sub(r'[._]', ' ', title).strip()
    return title or folder_name


def _read_tmdb_key_from_ua() -> str:
    for path in [
        "/upload-assistant/data/Config/config.py",
        "/upload-assistant/config.py",
    ]:
        try:
            content = Path(path).read_text()
            m = re.search(r'tmdb_api\s*=\s*["\']([^"\']{10,})["\']', content)
            if m:
                return m.group(1)
        except Exception:
            pass
    return ""

router = APIRouter()

_VIDEO_EXTS = {".mkv", ".mp4", ".avi", ".m2ts", ".ts", ".mov", ".wmv"}


class ScanDirResult(BaseModel):
    video_name: str | None = None
    video_path: str | None = None


def _allowed(path: Path) -> bool:
    resolved = path.resolve()
    return any(
        str(resolved).startswith(str(Path(r).resolve()))
        for r in settings.media_roots
    )


@router.get("/browse", response_model=BrowseResponse)
def browse(path: str | None = None):
    if path is None:
        entries = [
            BrowseEntry(name=Path(r).name, path=r, is_dir=True)
            for r in settings.media_roots
            if os.path.exists(r)
        ]
        return BrowseResponse(entries=entries)

    target = Path(path)
    if not _allowed(target):
        raise HTTPException(status_code=403, detail="Path outside allowed roots")
    if not target.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")

    entries = []
    for entry in sorted(os.scandir(target), key=lambda e: (not e.is_dir(), e.name.lower())):
        stat = entry.stat(follow_symlinks=False)
        entries.append(
            BrowseEntry(
                name=entry.name,
                path=entry.path,
                is_dir=entry.is_dir(),
                size=stat.st_size if not entry.is_dir() else None,
                mtime=stat.st_mtime,
            )
        )
    return BrowseResponse(entries=entries)


@router.get("/browse/poster")
async def get_poster(name: str, db: Session = Depends(get_db)):
    from app.api.config_api import get_config_value

    if name in _poster_cache:
        return {"poster_url": _poster_cache[name]}

    tmdb_key = get_config_value("tmdb_api_key", db) or _read_tmdb_key_from_ua()
    if not tmdb_key:
        _poster_cache[name] = None
        return {"poster_url": None}

    title = _extract_title(name)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                "https://api.themoviedb.org/3/search/multi",
                params={"api_key": tmdb_key, "query": title, "language": "fr"},
            )
        results = r.json().get("results", [])
        poster_path = results[0].get("poster_path") if results else None
        url = f"https://image.tmdb.org/t/p/w300{poster_path}" if poster_path else None
    except Exception:
        url = None

    _poster_cache[name] = url
    return {"poster_url": url}


@router.get("/browse/scan-dir", response_model=ScanDirResult)
def scan_dir(path: str):
    target = Path(path)
    if not _allowed(target):
        raise HTTPException(status_code=403, detail="Path outside allowed roots")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Not a directory")

    best: tuple[int, Path] | None = None
    for entry in target.iterdir():
        if entry.is_file() and entry.suffix.lower() in _VIDEO_EXTS:
            size = entry.stat().st_size
            if best is None or size > best[0]:
                best = (size, entry)

    if best:
        return ScanDirResult(video_name=best[1].name, video_path=str(best[1]))
    return ScanDirResult()
