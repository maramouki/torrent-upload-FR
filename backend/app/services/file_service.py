import os
import re
import shutil
from pathlib import Path


_NON_TAG_TOKENS = {
    # resolutions
    "480P", "576P", "720P", "1080P", "1080I", "2160P", "4K", "UHD",
    # sources
    "BLURAY", "REMUX", "BDREMUX", "WEBDL", "WEBRIP", "HDTV", "HDRIP", "DVDRIP",
    # codecs
    "H264", "H265", "X264", "X265", "AVC", "HEVC", "AV1",
    # audio
    "DTS", "AAC", "AC3", "DD5", "ATMOS", "TRUEHD", "DDP", "EAC3",
    # HDR
    "HDR", "HDR10", "DOLBY", "VISION",
    # editions
    "REPACK", "PROPER", "EXTENDED", "THEATRICAL", "UNRATED", "DIRECTORS",
    # misc
    "NOTAG", "MULTI", "VOSTFR", "FRENCH", "TRUEFRENCH",
}


def detect_tag(filename: str) -> str | None:
    name = Path(filename).name
    stem = Path(name).stem if '.' in name and not name.startswith('.') else name
    m = re.search(r"[-.]([A-Z0-9]{3,12})$", stem, re.IGNORECASE)
    if not m:
        return None
    candidate = m.group(1).upper()
    if candidate in _NON_TAG_TOKENS:
        return None
    return candidate


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
