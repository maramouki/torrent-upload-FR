import httpx
from sqlalchemy.orm import Session


def _get_c411_settings(db: Session) -> tuple[str, str]:
    from app.api.config_api import get_config_value
    base = get_config_value("c411_api_base", db)
    key = get_config_value("c411_api_key", db)
    return base, key


async def check_duplicate(title: str, quality_slot: str, db: Session) -> dict:
    base, api_key = _get_c411_settings(db)
    if not base or not api_key:
        return {"duplicate": False, "existing": None, "error": "C411 API not configured"}
    try:
        async with httpx.AsyncClient(
            base_url=base,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10.0,
        ) as client:
            r = await client.get("/torrents/search", params={"name": title, "quality": quality_slot})
            r.raise_for_status()
            data = r.json()
            results = data.get("results", [])
            return {
                "duplicate": len(results) > 0,
                "existing": results[0] if results else None,
            }
    except Exception as e:
        return {"duplicate": False, "existing": None, "error": str(e)}
