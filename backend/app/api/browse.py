import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.schemas import BrowseEntry, BrowseResponse

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
