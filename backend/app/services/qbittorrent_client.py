import httpx
from app.config import settings


class QBittorrentClient:
    def __init__(self):
        self._base = settings.qbittorrent_url.rstrip("/")
        self._user = settings.qbittorrent_user
        self._password = settings.qbittorrent_password
        self._client = httpx.AsyncClient(base_url=self._base, timeout=10.0)
        self._logged_in = False

    async def _login(self):
        r = await self._client.post(
            "/api/v2/auth/login",
            data={"username": self._user, "password": self._password},
        )
        self._logged_in = r.text.strip() == "Ok."

    async def find_torrent_by_path(self, content_path: str) -> dict | None:
        if not self._logged_in:
            await self._login()
        try:
            r = await self._client.get("/api/v2/torrents/info", params={"filter": "all"})
            torrents = r.json()
            for t in torrents:
                save = t.get("save_path", "")
                name = t.get("name", "")
                if content_path.startswith(save) or name in content_path:
                    return t
        except Exception:
            pass
        return None

    async def get_tracker(self, torrent_hash: str) -> str | None:
        try:
            r = await self._client.get(
                "/api/v2/torrents/trackers", params={"hash": torrent_hash}
            )
            trackers = r.json()
            for t in trackers:
                url = t.get("url", "")
                if url and not url.startswith("**"):
                    return url
        except Exception:
            pass
        return None

    async def close(self):
        await self._client.aclose()


qbittorrent_client = QBittorrentClient()
