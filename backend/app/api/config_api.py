from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AppConfig
from app.config import settings

router = APIRouter()

# Keys that can be edited via UI (order = display order)
EDITABLE_KEYS = [
    "media_roots",
    "upload_cli",
    "tmp_cache_root",
    "c411_api_base",
    "c411_api_key",
    "qbittorrent_url",
    "qbittorrent_user",
    "qbittorrent_password",
]

LABELS: dict[str, str] = {
    "media_roots": "Dossiers médias (séparés par virgule)",
    "upload_cli": "Commande upload-c411",
    "tmp_cache_root": "Dossier cache tmp",
    "c411_api_base": "URL API C411",
    "c411_api_key": "Clé API C411 (Bearer token)",
    "qbittorrent_url": "URL qBittorrent WebUI",
    "qbittorrent_user": "Login qBittorrent",
    "qbittorrent_password": "Mot de passe qBittorrent",
}

SECRET_KEYS = {"c411_api_key", "qbittorrent_password"}


def _default(key: str) -> str:
    v = getattr(settings, key, "")
    if isinstance(v, list):
        return ",".join(v)
    return str(v) if v else ""


def get_config_value(key: str, db: Session) -> str:
    row = db.query(AppConfig).filter(AppConfig.key == key).first()
    return row.value if row else _default(key)


def get_all_config(db: Session) -> dict[str, str]:
    rows = {r.key: r.value for r in db.query(AppConfig).all()}
    return {k: rows.get(k, _default(k)) for k in EDITABLE_KEYS}


class ConfigEntry(BaseModel):
    key: str
    label: str
    value: str
    is_secret: bool


class ConfigResponse(BaseModel):
    entries: list[ConfigEntry]


class ConfigUpdateRequest(BaseModel):
    key: str
    value: str


@router.get("/config", response_model=ConfigResponse)
def get_config(db: Session = Depends(get_db)):
    all_cfg = get_all_config(db)
    entries = []
    for key in EDITABLE_KEYS:
        val = all_cfg[key]
        entries.append(ConfigEntry(
            key=key,
            label=LABELS[key],
            value="" if key in SECRET_KEYS and val else val,  # mask secrets in GET
            is_secret=key in SECRET_KEYS,
        ))
    return ConfigResponse(entries=entries)


@router.put("/config")
def update_config(req: ConfigUpdateRequest, db: Session = Depends(get_db)):
    if req.key not in EDITABLE_KEYS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Unknown config key: {req.key}")
    row = db.query(AppConfig).filter(AppConfig.key == req.key).first()
    if row:
        row.value = req.value
    else:
        db.add(AppConfig(key=req.key, value=req.value))
    db.commit()
    return {"key": req.key, "saved": True}
