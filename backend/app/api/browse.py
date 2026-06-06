import os
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.schemas import BrowseEntry, BrowseResponse

router = APIRouter()


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
