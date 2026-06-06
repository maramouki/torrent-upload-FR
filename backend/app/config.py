from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    media_roots: list[str] = ["/mnt/media/movies", "/mnt/media/series"]
    upload_cli: str = "upload-c411"
    tmp_cache_root: str = "/tmp/upload-c411"
    sqlite_path: str = "/app/data/app.db"
    c411_api_base: str = ""
    c411_api_key: str = ""
    qbittorrent_url: str = "http://localhost:8080"
    qbittorrent_user: str = "admin"
    qbittorrent_password: str = "adminadmin"

    model_config = {"env_file": ".env"}


settings = Settings()
