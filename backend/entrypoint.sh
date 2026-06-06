#!/bin/bash
set -e

UA_REQ="/upload-assistant/requirements.txt"

if [ -f "$UA_REQ" ]; then
    echo "[entrypoint] Installing Upload-Assistant dependencies..."
    pip install --quiet --no-cache-dir -r "$UA_REQ" || true
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
