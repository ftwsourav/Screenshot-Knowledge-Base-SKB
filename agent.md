# Screenshot Knowledge Base (SKB)

A local‑first, privacy‑respecting system that makes your screenshots searchable, organized, and truly useful.

---

## 1) Problem → Outcome
**Problem:** People save tons of screenshots (receipts, chats, errors, tutorials) but can’t find them later.
**Outcome:** Instantly search screenshots by text, tags, app/source, and time; auto‑summaries; secure storage; optional multi‑device sync.

**Pitch (resume/README ready):**
> SKB is a local‑first desktop + web app that ingests screenshots, extracts text with OCR, auto‑tags using lightweight NLP, and enables blazing‑fast search (keyword + semantic). It supports folder watching, bulk import, and optional end‑to‑end encrypted cloud sync. Built with a clean modular architecture, full test coverage, and CI/CD.

---

## 2) User Personas & Jobs To Be Done
- **Developer:** find a past error message/code snippet from a screenshot.
- **Student/Researcher:** retrieve a figure/table from a paper screenshot.
- **Buyer/Home user:** locate warranty, invoice, or recipe screenshot quickly.

**JTBD:** “When I search a phrase/concept, I want the right screenshot + context in <2s, so I can act now.”

---

## 3) MVP Feature Set (2–3 weeks)
1. **Ingestion**
   - Drag & drop upload
   - Folder watcher (configurable paths)
   - Bulk import with progress
2. **OCR**
   - Tesseract (offline) for English (+ easy language packs)
   - OCR per image; store full text + confidence
3. **Indexing & Search**
   - Keyword search (SQLite FTS5)
   - Filters: date range, file type, source app (if known), tag
4. **Auto‑Tagging & Metadata**
   - Regex/keyword-based classifiers ("invoice", "error", "chat", "recipe")
   - Manual tags + notes
5. **Viewer**
   - Grid gallery + detail view (zoom, copy text)
6. **Local‑first Security**
   - Optional encrypted DB (SQLCipher) + OS keychain for key
7. **Export/Backup**
   - Export JSON+media bundle; import back later

---

## 4) Shine Features (Phase 2)
- **Semantic search**: sentence-transformer embeddings stored in SQLite BLOB; cosine similarity queries
- **Auto-summaries**: short description per screenshot
- **Deduplication**: perceptual hashing (pHash) to merge near-duplicates
- **Redaction**: local blur for emails/IDs before share
- **Browser extension** (Chromium/Firefox): send current tab screenshot directly to SKB
- **Mobile companion**: iOS/Android capture to local server
- **Sync**: user-opt‑in end‑to‑end encrypted sync via Supabase/Postgres

---

## 5) Architecture Overview
**Local-first monorepo**
```
apps/
  web/        (Next.js UI)
  desktop/    (Electron shell for web UI + native menus)
  swift-mac/  (SwiftUI optional macOS client, v2)
packages/
  server/     (FastAPI or Express API)
  ocr/        (OCR pipeline wrapper)
  search/     (FTS + embeddings utils)
  db/         (SQLite/SQLCipher schema + migrations)
  common/     (types, DTOs, logging)
```

**Data flow**
```
[File Watcher / DragDrop] → [OCR Pipeline] → [Indexer] → [SQLite(FTS5)]
                                         ↘ [Tags/NLP] → [Metadata]
UI (Next.js/Electron) ↔ API (FastAPI/Express) ↔ SQLite/SQLCipher
```

**Why this stack**
- **SQLite + FTS5** = zero‑ops, fast local search
- **Tesseract** = offline OCR, privacy‑friendly
- **Next.js + Electron** = one codebase for web & desktop
- **Optional SwiftUI** = native mac polish (future)

---

## 6) Tech Choices
- **Frontend:** Next.js (App Router), React 18, Tailwind, shadcn/ui
- **Desktop:** Electron (auto‑updates later), file system access
- **Backend:** FastAPI (Python) *or* Express (Node)—choose one; this spec shows both paths
- **OCR:** Tesseract via `pytesseract` (Python) or `tesseract.js` (Node)
- **DB:** SQLite (dev) → SQLCipher (prod optional)
- **Search:** SQLite FTS5 (keyword) + (phase 2) embeddings with `sentence-transformers`/`all-MiniLM-L6-v2`
- **Images:** store originals on disk; DB stores paths + metadata
- **Queue:** lightweight job queue (BullMQ for Node or RQ for Python)
- **Packaging:** pnpm (monorepo), uv/pip (Python) or just Node

---

## 7) Data Model (SQLite)
Tables (simplified):
```
screenshots(
  id TEXT PRIMARY KEY,
  file_path TEXT UNIQUE,
  file_hash TEXT,
  created_at INTEGER,           -- file ctime
  imported_at INTEGER,
  width INTEGER,
  height INTEGER,
  source_app TEXT,              -- try infer: whatsapp, chrome, vscode
  mime TEXT,
  ocr_confidence REAL,
  summary TEXT                  -- optional, v2
);

texts(
  screenshot_id TEXT REFERENCES screenshots(id) ON DELETE CASCADE,
  content TEXT
);

-- FTS virtual table for fast text search
texts_fts USING fts5(content, content='texts', content_rowid='rowid');

metadata(
  screenshot_id TEXT REFERENCES screenshots(id) ON DELETE CASCADE,
  key TEXT,
  value TEXT,
  PRIMARY KEY (screenshot_id, key)
);

tags(
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE
);

screenshot_tags(
  screenshot_id TEXT REFERENCES screenshots(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (screenshot_id, tag_id)
);

embeddings(
  screenshot_id TEXT PRIMARY KEY,
  vector BLOB                        -- optional phase 2
);
```

Indexes: `CREATE INDEX idx_screenshots_created_at ON screenshots(created_at);`

---

## 8) OCR Pipeline
1. Image load → normalize (grayscale, deskew, threshold)
2. Language packs: `eng` default; allow `hin`, `ben`, etc.
3. OCR → text + confidence
4. Post‑process: join lines, remove artifacts, detect sensitive tokens (emails, phone, card)
5. Store text → update FTS

Error handling: retry once; mark failed items; expose “Re‑OCR” action.

---

## 9) Tagging & Classification
- **Rules:**
  - If text contains `INVOICE|Order|GST` → tag `invoice`
  - If `Exception|Traceback|Error` → tag `error`
  - If `WhatsApp|Telegram|@username` → tag `chat`
  - If `Ingredients|Serves|cup|ml` → tag `recipe`
- **Source inference:** from filename or EXIF (app names)
- **Manual override:** users can add/remove tags

---

## 10) Search UX
- Search bar with instant results (debounced)
- Filters: date range, tag chips, source app, has text/has no text
- Sort: newest, oldest, best text density
- Result card: thumbnail, top lines of OCR, tags, created_at
- Detail page: full image, text pane (copy), quick actions (Open file, Reveal in folder, Add tag, Redact, Export)

---

## 11) Security & Privacy
- Local by default; nothing leaves device without user action
- Optional **SQLCipher** encrypted DB
- Key management: store key in OS keychain (macOS Keychain, Windows Credential Manager, libsecret)
- No third‑party analytics by default; optional local metrics only

---

## 12) API (if using FastAPI)
```
POST /api/import                # upload file(s)
POST /api/import/folder         # add folder to watchlist
GET  /api/screenshots           # list with query, filters, pagination
GET  /api/screenshots/{id}
PATCH/POST /api/screenshots/{id}/tags
POST /api/reindex/{id}          # re-run OCR
GET  /api/search?q=...&tag=...&from=...&to=...
POST /api/export                # create export bundle
POST /api/import/bundle         # import bundle
```

**Search SQL (FTS):**
```
SELECT s.id, snippet(texts_fts, 0, '[', ']', '…', 8) AS snip
FROM texts_fts
JOIN texts t ON t.rowid = texts_fts.rowid
JOIN screenshots s ON s.id = t.screenshot_id
WHERE texts_fts MATCH :query
ORDER BY rank;
```

---

## 13) CLI (dev & power users)
```
skb import /path/to/dir
skb watch add /path
skb reocr <id|all>
skb search "error timeout"
skb export out.skb
skb import-bundle out.skb
```

---

## 14) Desktop (Electron) UX
- Native menu: File (Import, Watch folder), Edit, View, Help
- Tray icon: quick import, recent items
- File system prompts with OS dialogs
- Auto‑launch on login (optional)

---

## 15) Browser Extension (v2)
- Button “Send screenshot to SKB” → captures visible tab → posts to local API (`http://localhost:5656/api/import`)
- Minimal permissions; disable when API not running

---

## 16) Testing Strategy
- **Unit:** OCR wrapper, tagger, search queries, migrations
- **Integration:** ingestion → OCR → index → query flow
- **E2E:** Playwright for UI; electron‑playwright for desktop
- Deterministic fixtures with sample images
- CI matrix: Linux, macOS, Windows

---

## 17) CI/CD (GitHub Actions)
- Lint + typecheck + tests on PR
- Build artifacts: web (Next static), desktop installers (Win/MSI, mac/dmg, Linux/AppImage)
- Release tagging creates GitHub Release with binaries

---

## 18) Repo Structure (monorepo)
```
.
├─ apps/
│  ├─ web/            # Next.js UI
│  ├─ desktop/        # Electron wrapper
│  └─ swift-mac/      # (optional) SwiftUI client
├─ packages/
│  ├─ server/         # FastAPI or Express
│  ├─ db/             # Prisma or SQLModel + alembic
│  ├─ ocr/
│  ├─ search/
│  └─ common/
├─ docker/
├─ scripts/
├─ .github/workflows/
└─ README.md
```

---

## 19) Build & Run (VS Code + Xcode)
### A) VS Code (cross‑platform)
1. **Prereqs**: Node 20+, pnpm, Python 3.11+ (if FastAPI), Tesseract (`tesseract-ocr` package)
2. **Install**
   ```bash
   pnpm i
   ```
3. **Dev (Express path)**
   ```bash
   # Terminal 1 – server
   pnpm --filter @skb/server dev
   # Terminal 2 – web
   pnpm --filter @skb/web dev
   # Terminal 3 – electron
   pnpm --filter @skb/desktop dev
   ```
4. **Dev (FastAPI path)**
   ```bash
   uv venv && uv pip install -r packages/server/requirements.txt
   uv run uvicorn packages.server.main:app --reload --port 5656
   pnpm --filter @skb/web dev
   pnpm --filter @skb/desktop dev
   ```
5. **Tesseract check**
   ```bash
   tesseract --version
   ```

### B) Xcode (macOS optional native client)
- Open `apps/swift-mac/SKB.xcodeproj` in Xcode
- Set signing team → build & run (targets macOS 13+)
- The SwiftUI client calls the same local API at `http://localhost:5656`

---

## 20) Security Notes
- Enable SQLCipher with `PRAGMA key = '...';`
- Store key in macOS Keychain/Windows Credential Manager/Secret Service
- Redaction tool for sharing

---

## 21) Roadmap (Weeks)
**Week 1 (MVP base)**
- Monorepo setup, DB schema & migrations
- File import + folder watch
- OCR pipeline (eng), store text, FTS index
- Basic UI: gallery, details, keyword search

**Week 2 (Polish + tags)**
- Auto‑tagger rules, manual tags CRUD
- Filters (date, tag, source), copy text, open in folder
- Export/Import bundle
- Unit + integration tests, CI pipeline

**Week 3 (Shine)**
- Semantic search (embeddings) optional flag
- Dedup (pHash) + merge UI
- Security: SQLCipher toggle + keychain
- Packaged desktop builds + README + demo video

---

## 22) Acceptance Criteria (MVP)
- Import 1k screenshots in <10 min on mid‑range laptop
- OCR recall: can find queries that visibly appear in image
- Search latency: <200 ms for typical query on 1k items
- All operations work offline

---

## 23) Demo Script (Interview)
1. Import a folder live
2. Search `order #` → open invoice screenshot
3. Filter by `error` tag → copy error text
4. Show export bundle + re‑import on fresh instance
5. Toggle DB encryption; restart; login via keychain

---

## 24) Code Quality
- ESLint/Prettier, Husky pre‑commit
- Type‑safe APIs (tRPC or Zod schemas)
- Logger with request IDs
- Feature flags (env‑based)

---

## 25) Licensing & Compliance
- OSS license: MIT/Apache‑2.0
- Tesseract license notice
- No telemetry by default; optional opt‑in

---

## 26) README Skeleton (for repo)
```
# Screenshot Knowledge Base (SKB)

Local‑first, privacy‑respecting screenshot search.

## Features
- OCR (offline), tags, FTS search, folder watch, export/import

## Quickstart
- Install Tesseract, Node, pnpm
- pnpm i && pnpm dev

## Packaging
- pnpm build:desktop → installers in `dist/`

## Security
- Optional SQLCipher DB encryption (see docs/security.md)

## Roadmap
- Semantic search, dedup, browser extension
```

---

## 27) Stretch Goals
- Multi‑language OCR auto‑detect
- Handwriting OCR (experimental)
- GPT‑style conversational search over your screenshots (local LLM if feasible)

---

## 28) Interview Talking Points
- Tradeoffs: local‑first vs cloud, FTS vs vector search, OCR accuracy vs speed
- Reliability: idempotent imports, content hashing, retry queues
- Privacy: zero‑exfil, encryption, redaction workflow

---

## 29) Backlog (Nice‑to‑have tasks)
- Image annotations & highlights
- Collections (virtual albums)
- Share via time‑limited encrypted link
- WebDAV import
- Keyboard‑first UX (⌘K command palette)

---

**You’re ready to build.**
- Start with Week 1 tasks → push to GitHub.
- Open issues for Week 2/3 with labels (feat/bug/docs/good‑first‑issue).
- Record a 90‑second demo GIF for the README once MVP runs end‑to‑end.

