from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import UploadHistory
from app.schemas import RenameRequest, RenameResponse
from app.services.file_service import clear_tmp_cache, rename_path

router = APIRouter()


@router.post("/rename/skip")
def rename_skip(req: RenameRequest, db: Session = Depends(get_db)):
    """Mark job as renamed without touching the filesystem (no name change needed)."""
    row = db.query(UploadHistory).filter(UploadHistory.job_id == req.job_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    if row.status not in ("preview", "renamed"):
        raise HTTPException(status_code=400, detail=f"Cannot skip rename in status '{row.status}'")
    row.final_name = None
    row.status = "renamed"
    db.commit()
    return {"job_id": req.job_id, "status": "renamed"}


@router.post("/rename", response_model=RenameResponse)
def rename_file(req: RenameRequest, db: Session = Depends(get_db)):
    row = db.query(UploadHistory).filter(UploadHistory.job_id == req.job_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    if row.status not in ("preview", "renamed"):
        raise HTTPException(
            status_code=400, detail=f"Cannot rename in status '{row.status}'"
        )

    try:
        new_path = rename_path(row.path, req.new_name)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Rename failed: {e}")

    stem = Path(row.path).stem
    clear_tmp_cache(stem, settings.tmp_cache_root)

    row.final_name = req.new_name
    row.status = "renamed"
    db.commit()

    return RenameResponse(new_path=new_path)
