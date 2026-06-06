import httpx
from app.config import settings


class C411Client:
    def __init__(self):
        self._client = httpx.AsyncClient(
            base_url=settings.c411_api_base,
            headers={"Authorization": f"Bearer {settings.c411_api_key}"},
            timeout=10.0,
        )

    async def check_duplicate(self, title: str, quality_slot: str) -> dict:
        if not settings.c411_api_base or not settings.c411_api_key:
            return {"duplicate": False, "existing": None, "error": "C411 API not configured"}
        try:
            r = await self._client.get(
                "/torrents/search",
                params={"name": title, "quality": quality_slot},
            )
            r.raise_for_status()
            data = r.json()
            results = data.get("results", [])
            return {
                "duplicate": len(results) > 0,
                "existing": results[0] if results else None,
            }
        except Exception as e:
            return {"duplicate": False, "existing": None, "error": str(e)}

    async def close(self):
        await self._client.aclose()


c411_client = C411Client()
