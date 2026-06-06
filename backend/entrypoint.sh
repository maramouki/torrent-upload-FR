#!/bin/bash
set -e

UA_REQ="/upload-assistant/requirements.txt"
UA_STAMP="/app/data/.ua_deps_installed"

# Install Upload-Assistant dependencies once
if [ -f "$UA_REQ" ] && [ ! -f "$UA_STAMP" ]; then
    echo "[entrypoint] Installing Upload-Assistant dependencies..."
    pip install --no-cache-dir -r "$UA_REQ" || true
    touch "$UA_STAMP"
    echo "[entrypoint] Done."
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
