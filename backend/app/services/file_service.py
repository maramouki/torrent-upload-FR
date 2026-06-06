import os
import re
import shutil
from pathlib import Path


def detect_tag(filename: str) -> str | None:
    # Use the last path component (works for both files and folders)
    name = Path(filename).name
    # Remove extension if it's a file
    stem = Path(name).stem if '.' in name and not name.startswith('.') else name
    # Match -TAG or .TAG at the end (3-12 uppercase alphanumeric chars)
    m = re.search(r"[-.]([A-Z0-9]{3,12})$", stem, re.IGNORECASE)
    return m.group(1).upper() if m else None


def clear_tmp_cache(stem: str, tmp_root: str):
    target = Path(tmp_root) / stem
    shutil.rmtree(target, ignore_errors=True)


def rename_path(old: str, new_name: str) -> str:
    old_p = Path(old)
    new_p = old_p.parent / new_name
    os.rename(old_p, new_p)
    return str(new_p)


_QUALITY_TOKENS = {
    "resolution": ["480p", "576p", "720p", "1080p", "2160p", "4k", "uhd"],
    "source": ["bluray", "blu-ray", "web-dl", "webrip", "hdtv", "remux", "bdremux"],
}


def extract_quality_slot(filename: str) -> str:
    lower = filename.lower()
    res = next((t for t in _QUALITY_TOKENS["resolution"] if t in lower), "unknown")
    src = next((t for t in _QUALITY_TOKENS["source"] if t in lower), "unknown")
    return f"{res}-{src}"
