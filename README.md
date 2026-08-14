# CALM-WRITER

A calm, minimalist writing and reading platform. Users write personal stories, read anonymously, react with gentle emotions, and optionally collaborate in invite-only hubs.

## Architecture

This is an **npm workspaces monorepo** — one root `package.json` with `backend` and `frontend` as workspaces, so a single `npm install` produces one shared, deduplicated `node_modules` at the repo root (no separate installs or per-package `node_modules`).

- **Backend** (`backend/`) — Node.js + Express API (port 4000) with MongoDB (Mongoose), JWT auth, rate limiting, MinIO image uploads.
- **Frontend** (`frontend/`) — React (Vite) SPA (dev server port 3000). The Vite dev server proxies `/api` to the backend.

## Prerequisites

- **Node.js 18+** (tested with 22.x)
- **MongoDB** running locally (default URI: `mongodb://127.0.0.1:27017/calmstories`)
- **MinIO** (optional) via Docker — needed only for image uploads
- **Docker** — only if using the MinIO Docker setup

## Quick Start (Development)

1. **Install dependencies** (single command — installs backend + frontend together)

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   copy backend\.env.example backend\.env
   ```

   Then edit `backend\.env` and set `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `ADMIN_SECRET` to your own random values (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Add your SMTP credentials for email sign-up.

3. **Start MinIO** (optional, for uploads)

   ```powershell
   .\scripts\start-minio-docker.ps1
   ```

   Or run manually:

   ```bash
   docker run -d --name calmwriter-minio -p 9000:9000 -p 9001:9001 \
     -e "MINIO_ROOT_USER=minioadmin" -e "MINIO_ROOT_PASSWORD=minioadmin" \
     -v "$PWD\minio-data:/data" minio/minio server /data --console-address ":9001"
   ```

4. **Run the dev servers** (backend on :4000, frontend on :3000)

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Production

Serve the static frontend build while running the backend:

```bash
npm start
```

`npm start` builds the frontend, serves it with `serve` (SPA mode) alongside the backend. Set `NODE_ENV=production` and real secrets in `backend/.env` before deploying.

## Commands

| Command                  | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| `npm install`            | Installs all dependencies into one shared `node_modules`           |
| `npm run dev`            | Backend (nodemon) + frontend (Vite) in parallel                     |
| `npm start`              | Backend + frontend production build served via `serve`             |
| `npm run backend`        | Backend only dev server                                            |
| `npm run frontend`       | Frontend Vite dev server                                          |
| `npm run build -w frontend` | Build the frontend for production                                |

## Notes

- The repo is an **npm workspace**: never run `npm install` inside `backend/` or `frontend/` directly (this creates a second, duplicated `node_modules`). Always install from the repo root.
- Never commit `backend/.env` or `frontend/.env` — they contain secrets. Use the `.env.example` files as templates.
- Backend build configuration lives in `frontend/vite.config.js` (outDir defaults to `dist`).