import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    media_roots: list[str] = ["/mnt/media/movies", "/mnt/media/series"]
    upload_cli: str = "python3 /upload-assistant/upload.py"
    tmp_cache_root: str = "/tmp/upload-c411"
    sqlite_path: str = "/app/data/app.db"
    c411_api_base: str = ""
    c411_api_key: str = ""
    qbittorrent_url: str = "http://localhost:8080"
    qbittorrent_user: str = "admin"
    qbittorrent_password: str = "adminadmin"

    model_config = {
        "env_file": ".env",
        "env_nested_delimiter": None,
    }

    @classmethod
    def _parse_media_roots(cls, v: str | list) -> list[str]:
        if isinstance(v, list):
            return v
        return [p.strip() for p in v.split(",") if p.strip()]

    def model_post_init(self, __context: object) -> None:
        raw = os.environ.get("MEDIA_ROOTS", "")
        if raw:
            object.__setattr__(
                self,
                "media_roots",
                [p.strip() for p in raw.split(",") if p.strip()],
            )


settings = Settings()
