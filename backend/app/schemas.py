from pydantic import BaseModel


class BrowseEntry(BaseModel):
    name: str
    path: str
    is_dir: bool
    size: int | None = None
    mtime: float | None = None


class BrowseResponse(BaseModel):
    entries: list[BrowseEntry]


class TagDetectResponse(BaseModel):
    tag: str | None


class TagSuggestResponse(BaseModel):
    tags: list[str]


class PreviewRequest(BaseModel):
    path: str
    tag: str
    job_id: str


class PreviewResponse(BaseModel):
    job_id: str


class PreviewResultResponse(BaseModel):
    job_id: str
    c411_name: str | None
    status: str


class RenameRequest(BaseModel):
    job_id: str
    new_name: str


class RenameResponse(BaseModel):
    new_path: str


class UploadStartRequest(BaseModel):
    job_id: str
    confirmed: bool


class DuplicateCheckResponse(BaseModel):
    duplicate: bool
    existing: dict | None = None


class ProvenanceResponse(BaseModel):
    tracker: str | None
