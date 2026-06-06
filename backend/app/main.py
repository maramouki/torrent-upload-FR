from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.api import browse, tags, upload, rename, duplicate_check, provenance, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="torrent-upload-FR", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(browse.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(rename.router, prefix="/api")
app.include_router(duplicate_check.router, prefix="/api")
app.include_router(provenance.router, prefix="/api")
app.include_router(ws.router)
