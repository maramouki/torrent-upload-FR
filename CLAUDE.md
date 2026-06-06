# torrent-upload-FR

Interface web wrapper autour de `upload-c411` (Upload-Assistant-FR fork yippee0903) pour faciliter les uploads vers C411.

## Stack

- **Backend**: Python 3.12 + FastAPI + SQLAlchemy (SQLite) + httpx
- **Frontend**: React 18 + Vite + TypeScript + Zustand
- **Déploiement**: Docker Compose (backend port 8000, frontend port 80)
- **Temps réel**: WebSocket (`/ws/logs/{job_id}`) pour streamer stdout/stderr de `upload-c411`

## Setup rapide

```bash
cp .env.example .env
# éditer .env avec les vraies valeurs
docker compose up --build
```

Frontend accessible sur `http://leoserver:3000`.

Les clés API (C411, qBittorrent, etc.) peuvent être configurées directement dans l'app via l'onglet **Paramètres** — elles sont stockées en base SQLite. Les valeurs `.env` servent de valeurs par défaut initiales uniquement.

## Dev local (sans Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev  # proxy /api et /ws vers localhost:8000 configuré dans vite.config.ts
```

## Variables d'environnement requises

| Var | Description | Exemple |
|-----|-------------|---------|
| `MEDIA_ROOTS` | Dossiers médias séparés par virgule | `/mnt/media/movies,/mnt/media/series` |
| `UPLOAD_CLI` | Commande CLI | `upload-c411` |
| `TMP_CACHE_ROOT` | Dossier cache tmp d'upload-c411 | `/tmp/upload-c411` |
| `SQLITE_PATH` | Chemin DB SQLite | `/app/data/app.db` |
| `C411_API_BASE` | URL base API C411 | `https://c411.example.com/api` |
| `C411_API_KEY` | Bearer token C411 | `xxx` |
| `QBITTORRENT_URL` | URL qBittorrent WebUI | `http://localhost:8080` |
| `QBITTORRENT_USER` | Login qBittorrent | `admin` |
| `QBITTORRENT_PASSWORD` | Mot de passe qBittorrent | `xxx` |

## Règles métier critiques

1. **Renommage obligatoire avant upload** — `POST /api/upload/start` rejette si le status n'est pas `renamed`.
2. **Vidage cache** — fait automatiquement dans `POST /api/rename` (supprime `TMP_CACHE_ROOT/<stem>`).
3. **Tag non vide** — l'UI avertit si tag absent ; `-NOTAG` déclenche rejet DETAG sur C411.
4. **Path traversal guard** — `/api/browse` et `/api/rename` valident que le chemin est sous `MEDIA_ROOTS`.
5. **Slot de qualité** — le duplicate check compare titre + slot (résolution + source), pas juste le titre.

## API Reference

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/browse?path=` | Liste les fichiers/dossiers |
| GET | `/api/tags/detect?path=` | Détecte le tag depuis le nom de fichier |
| GET | `/api/tags/suggest?q=` | Suggestions de tags (autocomplete) |
| POST | `/api/upload/preview` | Lance `upload-c411 --debug` en background |
| GET | `/api/upload/preview-result/{job_id}` | Récupère le nom C411 proposé |
| POST | `/api/rename` | Renomme le fichier + vide le cache |
| GET | `/api/duplicate-check?path=&tag=` | Vérifie doublon sur C411 |
| GET | `/api/provenance?path=` | Lit le tracker source dans qBittorrent |
| POST | `/api/upload/start` | Lance l'upload réel |
| WS | `/ws/logs/{job_id}` | Stream des logs subprocess |

## Structure

```
backend/app/
├── main.py              # FastAPI app factory
├── config.py            # pydantic-settings
├── database.py          # SQLAlchemy + SQLite
├── models.py            # UploadHistory, TagSuggestion
├── schemas.py           # Pydantic I/O
├── api/                 # Routes FastAPI
└── services/            # Logique métier (subprocess, file ops, clients API)

frontend/src/
├── api/client.ts        # Appels axios typés
├── store/uploadStore.ts # Zustand (état wizard)
├── hooks/useWebSocket.ts
└── components/          # FileBrowser, TagInput, PreviewPanel, ConfirmUpload, LogViewer
```

## Ajouter un nouveau tracker

1. Créer `backend/app/services/<tracker>_client.py` sur le modèle de `c411_client.py`.
2. Ajouter la route API dans `backend/app/api/`.
3. Brancher dans `main.py`.

## Notes

- `upload-c411` doit être dans le `PATH` du container backend. Si installé dans un venv externe, monter le binaire via un volume ou configurer `UPLOAD_CLI` avec le chemin complet.
- Le container backend a besoin d'accès **en écriture** à `/mnt/media` pour les renommages.
- Les queues WebSocket sont en mémoire — perdues au redémarrage du backend (acceptable pour des sessions d'upload courtes).
