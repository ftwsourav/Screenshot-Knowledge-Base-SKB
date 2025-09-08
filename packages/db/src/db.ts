import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { config, logger } from '@skb/common';

export class DatabaseManager {
  private db: Database.Database;

  constructor() {
    const dbDir = path.dirname(config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(config.dbPath);

    if (config.enableEncryption && config.encryptionKey) {
      this.db.pragma(`cipher = 'sqlcipher'`);
      this.db.pragma(`key = '${config.encryptionKey}'`);
    }

    this.initializeSchema();
  }

  private initializeSchema() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
    logger.info('Database schema initialized');
  }

  getDb(): Database.Database {
    return this.db;
  }

  close() {
    this.db.close();
  }

  // Prepared statements for common operations
  private insertScreenshotStmt = this.db.prepare(`
    INSERT OR REPLACE INTO screenshots
    (id, file_path, file_hash, created_at, imported_at, width, height, source_app, mime, ocr_confidence, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  private insertTextStmt = this.db.prepare(`
    INSERT OR REPLACE INTO texts (screenshot_id, content) VALUES (?, ?)
  `);

  private insertMetadataStmt = this.db.prepare(`
    INSERT OR REPLACE INTO metadata (screenshot_id, key, value) VALUES (?, ?, ?)
  `);

  private getScreenshotStmt = this.db.prepare(`
    SELECT * FROM screenshots WHERE id = ?
  `);

  private searchStmt = this.db.prepare(`
    SELECT s.*, snippet(texts_fts, 0, '[', ']', '...', 8) as snippet
    FROM texts_fts
    JOIN texts t ON t.rowid = texts_fts.rowid
    JOIN screenshots s ON s.id = t.screenshot_id
    WHERE texts_fts MATCH ?
    ORDER BY rank
    LIMIT ? OFFSET ?
  `);

  insertScreenshot(screenshot: any) {
    this.insertScreenshotStmt.run(
      screenshot.id,
      screenshot.filePath,
      screenshot.fileHash,
      screenshot.createdAt,
      screenshot.importedAt,
      screenshot.width,
      screenshot.height,
      screenshot.sourceApp,
      screenshot.mime,
      screenshot.ocrConfidence,
      screenshot.summary
    );
  }

  insertText(screenshotId: string, content: string) {
    this.insertTextStmt.run(screenshotId, content);
  }

  insertMetadata(screenshotId: string, key: string, value: string) {
    this.insertMetadataStmt.run(screenshotId, key, value);
  }

  getScreenshot(id: string) {
    return this.getScreenshotStmt.get(id);
  }

  search(query: string, limit = 50, offset = 0) {
    return this.searchStmt.all(query, limit, offset);
  }
}

let dbManager: DatabaseManager;

export function getDbManager(): DatabaseManager {
  if (!dbManager) {
    dbManager = new DatabaseManager();
  }
  return dbManager;
}