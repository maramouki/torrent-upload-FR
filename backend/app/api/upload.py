import re
import asyncio
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import UploadHistory
from app.schemas import (
    PreviewRequest,
    PreviewResponse,
    PreviewResultResponse,
    UploadStartRequest,
)
from app.services.subprocess_manager import get_or_create_queue, run_command
from app.api.tags import upsert_tag

router = APIRouter()

_C411_NAME_RE = re.compile(
    r"(?:Torrent Name|Name|titre|Nom)\s*[:\-]\s*(.+)", re.IGNORECASE
)


def _extract_c411_name(lines: list[str]) -> str | None:
    for line in reversed(lines):
        m = _C411_NAME_RE.search(line)
        if m:
            return m.group(1).strip()
    return None


async def _run_preview(job_id: str, path: str, tag: str, db_path: str):
    from app.database import SessionLocal
    from app.models import UploadHistory
    from app.api.config_api import get_config_value

    db_tmp = SessionLocal()
    upload_cli = get_config_value("upload_cli", db_tmp)
    db_tmp.close()

    cli_parts = upload_cli.split()
    cmd = cli_parts + ["--debug", path]
    if tag:
        cmd = cli_parts + ["--debug", "--tag", tag, path]

    lines: list[str] = []
    queue = get_or_create_queue(job_id)

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    assert proc.stdout is not None
    async for raw in proc.stdout:
        line = raw.decode("utf-8", errors="replace").rstrip()
        lines.append(line)
        await queue.put(line)
    await proc.wait()
    await queue.put(None)

    c411_name = _extract_c411_name(lines)

    db = SessionLocal()
    try:
        row = db.query(UploadHistory).filter(UploadHistory.job_id == job_id).first()
        if row:
            row.c411_name = c411_name
            db.commit()
    finally:
        db.close()


async def _run_upload(job_id: str, final_path: str, tag: str):
    from app.database import SessionLocal
    from app.models import UploadHistory
    from app.api.config_api import get_config_value

    db_tmp = SessionLocal()
    upload_cli = get_config_value("upload_cli", db_tmp)
    db_tmp.close()

    cmd = upload_cli.split() + [final_path]
    db = SessionLocal()
    try:
        row = db.query(UploadHistory).filter(UploadHistory.job_id == job_id).first()
        if row:
            row.status = "uploading"
            db.commit()
    finally:
        db.close()

    rc = await run_command(job_id, cmd)

    db = SessionLocal()
    try:
        row = db.query(UploadHistory).filter(UploadHistory.job_id == job_id).first()
        if row:
            row.status = "done" if rc == 0 else "error"
            db.commit()
        if rc == 0 and tag:
            upsert_tag(tag, db)
    finally:
        db.close()


@router.post("/upload/preview", response_model=PreviewResponse)
async def upload_preview(
    req: PreviewRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    get_or_create_queue(req.job_id)

    row = UploadHistory(
        path=req.path,
        tag=req.tag,
        status="preview",
        job_id=req.job_id,
    )
    db.add(row)
    db.commit()

    background_tasks.add_task(
        _run_preview, req.job_id, req.path, req.tag, settings.sqlite_path
    )
    return PreviewResponse(job_id=req.job_id)


@router.get("/upload/preview-result/{job_id}", response_model=PreviewResultResponse)
def preview_result(job_id: str, db: Session = Depends(get_db)):
    row = db.query(UploadHistory).filter(UploadHistory.job_id == job_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return PreviewResultResponse(
        job_id=job_id, c411_name=row.c411_name, status=row.status
    )


@router.post("/upload/start")
async def upload_start(
    req: UploadStartRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if not req.confirmed:
        raise HTTPException(status_code=400, detail="confirmation required")

    row = db.query(UploadHistory).filter(UploadHistory.job_id == req.job_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    if row.status != "renamed":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot start upload: status is '{row.status}', expected 'renamed'",
        )

    final_path = str(Path(row.path).parent / row.final_name) if row.final_name else row.path
    background_tasks.add_task(_run_upload, req.job_id, final_path, row.tag or "")
    return {"job_id": req.job_id, "status": "uploading"}
