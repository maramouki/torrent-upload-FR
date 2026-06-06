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


_VIDEO_EXTS = {".mkv", ".mp4", ".avi", ".m2ts", ".ts", ".mov", ".wmv"}


def find_main_video(dir_path: Path) -> Path | None:
    best: tuple[int, Path] | None = None
    for entry in dir_path.iterdir():
        if entry.is_file() and entry.suffix.lower() in _VIDEO_EXTS:
            size = entry.stat().st_size
            if best is None or size > best[0]:
                best = (size, entry)
    return best[1] if best else None


def _ensure_ext(new_name: str, original: Path) -> str:
    """Add original extension to new_name if it has none."""
    if not Path(new_name).suffix and original.suffix:
        return new_name + original.suffix
    return new_name


def rename_path(old: str, new_name: str) -> str:
    old_p = Path(old)
    # If old_p is a directory, rename the main video file inside it
    if old_p.is_dir():
        video = find_main_video(old_p)
        if video is None:
            raise OSError(f"No video file found in {old_p}")
        new_p = old_p / _ensure_ext(new_name, video)
        os.rename(video, new_p)
        return str(new_p)
    new_p = old_p.parent / _ensure_ext(new_name, old_p)
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
