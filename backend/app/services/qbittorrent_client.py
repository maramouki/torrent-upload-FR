import httpx
from sqlalchemy.orm import Session


def _get_qbt_settings(db: Session) -> tuple[str, str, str]:
    from app.api.config_api import get_config_value
    url = get_config_value("qbittorrent_url", db)
    user = get_config_value("qbittorrent_user", db)
    password = get_config_value("qbittorrent_password", db)
    return url.rstrip("/"), user, password


async def find_torrent_by_path(content_path: str, db: Session) -> dict | None:
    base, user, password = _get_qbt_settings(db)
    if not base:
        return None
    try:
        async with httpx.AsyncClient(base_url=base, timeout=10.0) as client:
            await client.post("/api/v2/auth/login", data={"username": user, "password": password})
            r = await client.get("/api/v2/torrents/info", params={"filter": "all"})
            for t in r.json():
                save = t.get("save_path", "")
                name = t.get("name", "")
                if content_path.startswith(save) or name in content_path:
                    return t
    except Exception:
        pass
    return None


async def get_tracker(torrent_hash: str, db: Session) -> str | None:
    base, user, password = _get_qbt_settings(db)
    if not base:
        return None
    try:
        async with httpx.AsyncClient(base_url=base, timeout=10.0) as client:
            await client.post("/api/v2/auth/login", data={"username": user, "password": password})
            r = await client.get("/api/v2/torrents/trackers", params={"hash": torrent_hash})
            for t in r.json():
                url = t.get("url", "")
                if url and not url.startswith("**"):
                    return url
    except Exception:
        pass
    return None
