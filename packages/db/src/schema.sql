-- Screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
  id TEXT PRIMARY KEY,
  file_path TEXT UNIQUE,
  file_hash TEXT,
  created_at INTEGER,
  imported_at INTEGER,
  width INTEGER,
  height INTEGER,
  source_app TEXT,
  mime TEXT,
  ocr_confidence REAL,
  summary TEXT
);

-- Texts table
CREATE TABLE IF NOT EXISTS texts (
  screenshot_id TEXT REFERENCES screenshots(id) ON DELETE CASCADE,
  content TEXT,
  PRIMARY KEY (screenshot_id)
);

-- FTS virtual table for texts
CREATE VIRTUAL TABLE IF NOT EXISTS texts_fts USING fts5(
  content,
  content='texts',
  content_rowid='rowid'
);

-- Metadata table
CREATE TABLE IF NOT EXISTS metadata (
  screenshot_id TEXT REFERENCES screenshots(id) ON DELETE CASCADE,
  key TEXT,
  value TEXT,
  PRIMARY KEY (screenshot_id, key)
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE
);

-- Screenshot tags junction table
CREATE TABLE IF NOT EXISTS screenshot_tags (
  screenshot_id TEXT REFERENCES screenshots(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (screenshot_id, tag_id)
);

-- Embeddings table (for future semantic search)
CREATE TABLE IF NOT EXISTS embeddings (
  screenshot_id TEXT PRIMARY KEY,
  vector BLOB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_screenshots_created_at ON screenshots(created_at);
CREATE INDEX IF NOT EXISTS idx_screenshots_imported_at ON screenshots(imported_at);
CREATE INDEX IF NOT EXISTS idx_metadata_key ON metadata(key);

-- FTS sync triggers
CREATE TRIGGER IF NOT EXISTS texts_ai AFTER INSERT ON texts BEGIN
  INSERT INTO texts_fts(rowid, content) VALUES (new.rowid, new.content);
END;
CREATE TRIGGER IF NOT EXISTS texts_ad AFTER DELETE ON texts BEGIN
  INSERT INTO texts_fts(texts_fts, rowid, content) VALUES('delete', old.rowid, old.content);
END;
CREATE TRIGGER IF NOT EXISTS texts_au AFTER UPDATE ON texts BEGIN
  INSERT INTO texts_fts(texts_fts, rowid, content) VALUES('delete', old.rowid, old.content);
  INSERT INTO texts_fts(rowid, content) VALUES (new.rowid, new.content);
END;