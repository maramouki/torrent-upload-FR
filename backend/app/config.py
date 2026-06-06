from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    media_roots_raw: str = "/mnt/media/movies,/mnt/media/series"
    upload_cli: str = "python3 /upload-assistant/upload.py"
    tmp_cache_root: str = "/tmp/upload-c411"
    sqlite_path: str = "/app/data/app.db"
    c411_api_base: str = ""
    c411_api_key: str = ""
    qbittorrent_url: str = "http://localhost:8080"
    qbittorrent_user: str = "admin"
    qbittorrent_password: str = "adminadmin"

    model_config = {"env_file": ".env", "env_prefix": ""}

    @property
    def media_roots(self) -> list[str]:
        return [p.strip() for p in self.media_roots_raw.split(",") if p.strip()]


settings = Settings()
