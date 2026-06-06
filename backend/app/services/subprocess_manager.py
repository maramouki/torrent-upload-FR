import asyncio
from typing import Optional

_queues: dict[str, asyncio.Queue] = {}


def get_or_create_queue(job_id: str) -> asyncio.Queue:
    if job_id not in _queues:
        _queues[job_id] = asyncio.Queue()
    return _queues[job_id]


def cleanup_queue(job_id: str):
    _queues.pop(job_id, None)


async def run_command(job_id: str, cmd: list[str], cwd: Optional[str] = None) -> int:
    q = get_or_create_queue(job_id)
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        stdin=asyncio.subprocess.PIPE,
        cwd=cwd,
    )
    assert proc.stdout is not None
    # Auto-confirm any interactive prompts (e.g. "Is this correct? y/N")
    if proc.stdin:
        proc.stdin.write(b"y\n")
        proc.stdin.close()
    async for raw in proc.stdout:
        line = raw.decode("utf-8", errors="replace").rstrip()
        await q.put(line)
    await proc.wait()
    rc = proc.returncode if proc.returncode is not None else 0
    await q.put(None)  # sentinel: process ended
    return rc
