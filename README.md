# Screenshot Knowledge Base (SKB)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.0+-orange.svg)](https://pnpm.io/)
[![Status: MVP](https://img.shields.io/badge/status-MVP%20working-blue)](#progress)

Local-first, privacy-respecting screenshot search and organization system. Ingest screenshots, extract text with OCR, and search them instantly — all processing happens on your device, nothing leaves your machine.

## About

SKB turns a pile of unorganized screenshots into a searchable knowledge base. Drag in screenshots or point it at a folder, and Tesseract OCR reads the text from each image. That text is indexed in SQLite FTS5 so you can find any screenshot by the words it contains — an error message, an order number, a chat snippet — in milliseconds.

- **Local-first**: no cloud, no account, no telemetry. Your screenshots and their text never leave your device.
- **One codebase, two frontends**: a Next.js web dashboard and an Electron desktop app that wraps it with native menus and dialogs.
- **Modular monorepo**: separate packages for DB, OCR, search, and server so each piece can evolve independently.

## Table of Contents

- [Progress](#progress)
- [Roadmap](#roadmap)
- [Features](#features)
- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Building for Production](#building-for-production)
- [Testing](#testing)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Progress

**Status: MVP working end-to-end.** The full pipeline runs locally and is verified: import → OCR → FTS5 index → search → view.

### Implemented & verified

| Area | What works |
|---|---|
| **Ingestion** | Drag & drop upload (web), native file dialog (desktop), automatic folder watcher (chokidar), content dedup via SHA-256 |
| **OCR** | Tesseract.js with sharp preprocessing (grayscale + normalize), text + confidence stored, Re-OCR action |
| **Search** | SQLite FTS5 full-text search with snippet highlighting; filters by tag + date range (applied in all branches); LIKE fallback on FTS errors |
| **Data** | SQLite + WAL + foreign keys; FTS5 auto-sync triggers; stats, tag CRUD, dedup, typed DTOs |
| **Web UI** | Tailwind dashboard: stats bar, search bar (text/tag/date), upload dropzone, watch-folder, responsive gallery + pagination, detail page (image, metadata, OCR text + copy, tag manager, re-OCR, delete) |
| **Desktop** | Electron with File/Edit/View/Window/Help menus wired to native file/folder dialogs → API import; IPC + preload context bridge |
| **API** | Express server: import, folder-watch, list/search, detail, image stream, stats, tags, reindex, delete — `{ screenshots, total }` response shape |
| **Tooling** | pnpm workspaces + lockfile, ESLint, Tailwind, ts-jest; `pnpm -r build`, `lint`, `test`, `typecheck` all green |

### Verified during development
- `pnpm -r build` / `lint` / `test` / `typecheck` → all pass.
- Server smoke test (`scripts/smoke-test.mjs`): `/api/stats`, `/api/screenshots`, `/api/tags` return 200 on a fresh DB.
- End-to-end: two real screenshots ingested → OCR extracted text → FTS5 search returned matches with highlighted snippets; real image dimensions (1475×1193) and SHA-256 hashes stored.

### Known limitations
- **SQLCipher encryption** is stubbed: the config flags exist, but `better-sqlite3` must be compiled against SQLCipher to actually encrypt. The default build does not.
- **Source-app inference** is not implemented (`sourceApp` is always `null`).
- **No tests beyond `@skb/common`'s logger suite** — the other packages pass with `--passWithNoTests`.

## Roadmap

### Next up (Phase 2)
- [ ] **Auto-tagging** — regex/keyword classifiers (invoice, error, chat, recipe) run on import
- [ ] **Export / import bundle** — JSON + media archive, re-importable on another instance
- [ ] **Source-app inference** — derive app name from filename / EXIF where available
- [ ] **Test coverage** — unit tests for db, ocr, search, server; integration test for the ingest→search flow
- [ ] **CI** — GitHub Actions: lint + typecheck + test on PR (the `.github/workflows/` dir is empty)

### Later (Shine features)
- [ ] **Semantic search** — sentence-transformer embeddings in SQLite BLOBs, cosine similarity
- [ ] **Auto-summaries** — short description per screenshot
- [ ] **Deduplication UI** — perceptual hashing (pHash) to surface and merge near-duplicates
- [ ] **Redaction** — local blur for emails / IDs / cards before sharing
- [ ] **Browser extension** — capture current tab screenshot → POST to local API
- [ ] **Mobile companion** — iOS/Android capture to the local server
- [ ] **Sync** — opt-in end-to-end-encrypted sync (Supabase/Postgres)
- [ ] **Production packaging** — Electron installers (Win MSI, macOS DMG, Linux AppImage) via electron-builder
- [ ] **Multi-language OCR** — auto-detect language, additional traineddata packs
- [ ] **Keyboard-first UX** — command palette (Cmd/Ctrl+K)

## Features

- **OCR Processing**: Extract text from screenshots using Tesseract.js (bundled WASM — no system Tesseract install required)
- **Full-Text Search**: Fast keyword search across all screenshots using SQLite FTS5, with snippet highlighting
- **Smart Filters**: Search by text, filter by tag and date range, paginate results
- **Content Dedup**: SHA-256 hashing skips screenshots already imported
- **File Import**: Drag & drop upload (web), native file dialog (desktop), and automatic folder watching
- **Management Dashboard**: Stats overview, searchable gallery, detail view with OCR text + copy, tag CRUD, Re-OCR, and delete
- **Desktop App**: Native Electron application with menus and OS file/folder dialogs
- **Local-First**: No cloud dependencies — all data stored locally on your device
- **Privacy-Focused**: All processing happens locally, no data sent to external services
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Extensible**: Modular architecture with separate packages for easy customization

## Screenshots

*Coming soon — screenshots of the web interface and desktop app will be added here.*

## Quick Start

### Prerequisites

- **Node.js 18+** — [Download here](https://nodejs.org/). (Tested on Node 24; on Node 24 `better-sqlite3` v12+ is required for prebuilt binaries.)
- **pnpm 8+** — Install with `npm install -g pnpm`
- **System Tesseract is NOT required** — OCR uses `tesseract.js` (WASM), which auto-fetches the English language data on first run. To add other languages, see [OCR languages](#troubleshooting).

### Installation

```bash
# Clone the repository
git clone https://github.com/ftwsourav/Screenshot-Knowledge-Base-SKB.git
cd Screenshot-Knowledge-Base-SKB

# Install dependencies (links workspace packages, builds native modules)
pnpm install
```

### Development

Start all services simultaneously:

```bash
pnpm dev
```

This starts:
- **API Server** on http://localhost:5656
- **Web UI** on http://localhost:3000
- **Electron Desktop App** (loads the Web UI with native menus)

### Individual Services

```bash
# Start only the server
pnpm --filter @skb/server dev

# Start only the web app
pnpm --filter @skb/web dev

# Start only the desktop app (requires the web app on :3000)
pnpm --filter @skb/desktop dev
```

### Type-checking & smoke test

```bash
pnpm typecheck            # tsc --noEmit across all packages
node scripts/smoke-test.mjs   # boots the server against a temp DB and hits the read endpoints
```

## Usage

1. **Import Screenshots** — drag & drop into the web dashboard, use the desktop app's File → Import Screenshot… menu, or configure a watched folder.
2. **Search** — type keywords to find screenshots by their extracted text content; results show matched snippets.
3. **Browse** — view the gallery with thumbnails, dates, and tags; click a card for the full detail view.
4. **Organize** — add/remove tags, copy OCR text, re-run OCR if quality is poor, or delete screenshots.

### Folder Watching

Configure automatic import from a directory — new images are ingested, OCR'd, and indexed automatically:

```bash
# Via API
curl -X POST http://localhost:5656/api/import/folder \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/screenshots/folder"}'
```

On the desktop app, use **File → Watch Folder…** and pick a directory with the native dialog.

## API Documentation

The SKB server provides a REST API for programmatic access.

### Base URL
```
http://localhost:5656/api
```

### Endpoints

#### Import Screenshot
```http
POST /api/import
```
Upload a single screenshot file. Content-Type: `multipart/form-data`, field `file`. Duplicates (by SHA-256) are skipped.
**Response:**
```json
{ "success": true, "screenshotId": "1788662293276-612c4bb9", "duplicate": false }
```

#### List / Search Screenshots
```http
GET /api/screenshots
GET /api/search          (alias)
```
**Query parameters:** `q` (FTS text query), `tag` (filter by tag name), `from` / `to` (ms timestamps), `limit` (default 50), `offset` (default 0).
**Response:**
```json
{
  "screenshots": [
    {
      "id": "1788662293276-612c4bb9",
      "filePath": "~/.skb/images/1788662293276-612c4bb9.png",
      "fileHash": "3665fc6a8af0...",
      "createdAt": 1788662293258,
      "importedAt": 1788662297306,
      "width": 1475,
      "height": 1193,
      "sourceApp": null,
      "mime": "image/png",
      "ocrConfidence": 61,
      "snippet": "...matched text..."
    }
  ],
  "total": 1
}
```

#### Get Screenshot Detail
```http
GET /api/screenshots/{id}
```
**Response:** `ScreenshotDetail` — all fields above plus `text` (full OCR text) and `tags` (string array).

#### Get Screenshot Image
```http
GET /api/screenshots/{id}/image
```
Streams the stored image file with the correct `Content-Type`. Use as an `<img src>`.

#### Delete Screenshot
```http
DELETE /api/screenshots/{id}
```
Removes the DB record (cascades to text/tags/metadata) and deletes the stored image file.
**Response:** `{ "success": true }`

#### Re-OCR
```http
POST /api/reindex/{id}
```
Re-runs OCR on the stored image and updates the text + FTS index.
**Response:** `{ "success": true, "ocrConfidence": 62 }`

#### Watch Folder
```http
POST /api/import/folder
```
**Request:** `{ "path": "/path/to/watch/folder" }` · **Response:** `{ "success": true }`

#### Stats
```http
GET /api/stats
```
**Response:**
```json
{
  "totalScreenshots": 2,
  "totalWithText": 2,
  "totalTags": 0,
  "bySource": {},
  "recentImports": 2
}
```

#### Tags
```http
GET  /api/tags                          -> { "tags": ["invoice", "error"] }
POST /api/screenshots/{id}/tags          body { "tags": ["invoice","error"] }  -> { "tags": [...] }   (replace all)
DELETE /api/screenshots/{id}/tags/{tag}                                            -> { "tags": [...] }
```

## Architecture

```
apps/
├── web/          # Next.js (pages router) management dashboard, React + Tailwind
└── desktop/      # Electron shell: native menus, file/folder dialogs, IPC, preload

packages/
├── common/       # Shared TypeScript types (DTOs), config, logger
├── db/           # better-sqlite3 + SQLite FTS5: schema, triggers, typed queries, stats, tags
├── ocr/          # Tesseract.js + sharp: preprocessing, text extraction
├── search/       # Thin search service delegating to the DB layer
└── server/       # Express API: import, watcher, search, stats, tags, reindex, image serving
```

**Data flow**
```
[File Watcher / DragDrop / Desktop dialog] → [OCR (sharp → tesseract.js)] → [SQLite + FTS5]
UI (Next.js / Electron) ↔ API (Express) ↔ SQLite
```

### Technology Stack

- **Frontend**: Next.js 14 (pages router), React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: SQLite (`better-sqlite3` v12) with FTS5 for full-text search, WAL mode
- **OCR**: Tesseract.js (WASM) + sharp for image preprocessing
- **Desktop**: Electron 28 with context isolation + preload bridge
- **Build Tool**: pnpm workspaces for monorepo management
- **Testing**: Jest + ts-jest

## Configuration

Configure SKB using environment variables (see `.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `SKB_DB_PATH` | Database file location | `~/.skb/database.db` |
| `SKB_IMAGES_PATH` | Images storage directory | `~/.skb/images` |
| `SKB_PORT` | API server port | `5656` |
| `SKB_LOG_LEVEL` | Logging level (error, warn, info, debug) | `info` |
| `SKB_ENCRYPTION` | Enable SQLCipher encryption (requires sqlcipher-enabled build) | `false` |
| `SKB_ENCRYPTION_KEY` | Encryption key for SQLCipher | — |
| `SKB_API_URL` | API base URL (used by desktop) | `http://localhost:5656` |
| `SKB_WEB_URL` | Web UI URL (used by desktop) | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | API base URL exposed to the browser (web) | `http://localhost:5656` |

Copy `.env.example` to `.env` to customize:

```bash
cp .env.example .env
```

## Building for Production

```bash
# Build all packages (topological order: common → db/ocr → search → server/web/desktop)
pnpm build

# Start the production server
pnpm --filter @skb/server start

# Build desktop installers (Windows MSI, macOS DMG, Linux AppImage) — TODO
pnpm --filter @skb/desktop build:electron
```

## Testing

```bash
# Run all tests across the workspace
pnpm test

# Run tests for a specific package
pnpm --filter @skb/common test

# Type-check all packages
pnpm typecheck

# Smoke test the server against a throwaway database
node scripts/smoke-test.mjs
```

## Security

- **Local Processing**: All OCR and data processing happens locally.
- **No External Data**: No screenshots or text data is sent to external services.
- **Optional Encryption**: The database can be encrypted with SQLCipher — note this requires `better-sqlite3` built against SQLCipher (the default prebuilt binary does not support it).
- **Content Isolation**: The Electron desktop app uses `contextIsolation: true` and a restricted preload bridge — no direct Node access from the renderer.

## Troubleshooting

### Tesseract Not Found / OCR errors
OCR uses `tesseract.js` (WASM), not a system Tesseract install. On first OCR run it downloads the English language data (`eng.traineddata`, ~5 MB) into the working directory. If that download is blocked (offline / firewall), pre-place a traineddata file or run once while online. To add other languages, see the `tesseract.js` language options.

### better-sqlite3 native build fails
On very new Node versions there may be no prebuilt binary. SKB pins `better-sqlite3@^12`, which ships prebuilts for Node 24. If you still hit `Could not locate the bindings file`:
- Ensure `pnpm.onlyBuiltDependencies` in the root `package.json` allows `better-sqlite3` (it does by default).
- Rebuild: `pnpm rebuild better-sqlite3`.
- On Node 18–22, older prebuilts are also available.

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5656
```
Change the port: `SKB_PORT=5657 pnpm --filter @skb/server dev`

### Electron opens as a blank/black window or crashes on `app.whenReady`
If `ELECTRON_RUN_AS_NODE=1` is set in your environment, Electron runs as plain Node and crashes. The desktop launch script (`apps/desktop/scripts/launch.js`) clears that variable before spawning Electron. If launching Electron manually, unset it first.

### Database Permission Issues
```
Error: SQLITE_CANTOPEN: unable to open database file
```
Ensure the directory exists and is writable: `mkdir -p ~/.skb`

### OCR Quality Issues
- Ensure good image quality and resolution.
- Confirm the correct language data is available.
- Use the **Re-OCR** action on the detail page to retry.

### Getting Help

- Open an issue: https://github.com/ftwsourav/Screenshot-Knowledge-Base-SKB/issues

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Make** your changes with proper TypeScript types and tests
4. **Verify**: `pnpm typecheck && pnpm lint && pnpm test`
5. **Commit** with clear messages: `git commit -m "Add: your feature description"`
6. **Push** to your branch: `git push origin feature/your-feature-name`
7. **Create** a Pull Request with a detailed description

### Development Guidelines

- Use TypeScript for all new code
- Follow existing code style and patterns (ESLint + Prettier)
- Add tests for new features
- Update documentation as needed
- Ensure cross-platform compatibility
- Keep the search/DB logic consolidated in `packages/db` (the `search` package delegates to it)

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

Copyright (c) 2024 Screenshot Knowledge Base
