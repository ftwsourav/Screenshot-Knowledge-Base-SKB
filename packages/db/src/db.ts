import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import {
  config,
  logger,
  Screenshot,
  SearchQuery,
  ScreenshotDTO,
  SearchResponse,
  ScreenshotDetail,
  StatsResponse,
} from '@skb/common';

export class DatabaseManager {
  private db: Database.Database;

  private insertScreenshotStmt!: Database.Statement;
  private insertTextStmt!: Database.Statement;
  private insertMetadataStmt!: Database.Statement;
  private getScreenshotStmt!: Database.Statement;
  private getByHashStmt!: Database.Statement;
  private getTextStmt!: Database.Statement;
  private deleteScreenshotStmt!: Database.Statement;
  private deleteScreenshotTagsStmt!: Database.Statement;
  private insertTagStmt!: Database.Statement;
  private linkTagStmt!: Database.Statement;
  private removeTagStmt!: Database.Statement;
  private getAllTagsStmt!: Database.Statement;
  private getTagsForScreenshotStmt!: Database.Statement;
  private countScreenshotsStmt!: Database.Statement;
  private countTextsStmt!: Database.Statement;
  private countTagsStmt!: Database.Statement;
  private bySourceStmt!: Database.Statement;
  private recentImportsStmt!: Database.Statement;

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

    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.initializeSchema();
    this.prepareStatements();
  }

  private initializeSchema(): void {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
    logger.info('Database schema initialized');
  }

  private prepareStatements(): void {
    this.insertScreenshotStmt = this.db.prepare(`
      INSERT OR REPLACE INTO screenshots
      (id, file_path, file_hash, created_at, imported_at, width, height, source_app, mime, ocr_confidence, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.insertTextStmt = this.db.prepare(`
      INSERT OR REPLACE INTO texts (screenshot_id, content) VALUES (?, ?)
    `);

    this.insertMetadataStmt = this.db.prepare(`
      INSERT OR REPLACE INTO metadata (screenshot_id, key, value) VALUES (?, ?, ?)
    `);

    this.getScreenshotStmt = this.db.prepare(`
      SELECT * FROM screenshots WHERE id = ?
    `);

    this.getByHashStmt = this.db.prepare(`
      SELECT * FROM screenshots WHERE file_hash = ?
    `);

    this.getTextStmt = this.db.prepare(`
      SELECT content FROM texts WHERE screenshot_id = ?
    `);

    this.deleteScreenshotStmt = this.db.prepare(`
      DELETE FROM screenshots WHERE id = ?
    `);

    this.deleteScreenshotTagsStmt = this.db.prepare(`
      DELETE FROM screenshot_tags WHERE screenshot_id = ?
    `);

    this.insertTagStmt = this.db.prepare(`
      INSERT OR IGNORE INTO tags (name) VALUES (?)
    `);

    this.linkTagStmt = this.db.prepare(`
      INSERT OR IGNORE INTO screenshot_tags (screenshot_id, tag_id)
      SELECT ?, id FROM tags WHERE name = ?
    `);

    this.removeTagStmt = this.db.prepare(`
      DELETE FROM screenshot_tags
      WHERE screenshot_id = ? AND tag_id = (SELECT id FROM tags WHERE name = ?)
    `);

    this.getAllTagsStmt = this.db.prepare(`
      SELECT name FROM tags ORDER BY name
    `);

    this.getTagsForScreenshotStmt = this.db.prepare(`
      SELECT tg.name AS name
      FROM screenshot_tags st
      JOIN tags tg ON st.tag_id = tg.id
      WHERE st.screenshot_id = ?
      ORDER BY tg.name
    `);

    this.countScreenshotsStmt = this.db.prepare(`
      SELECT COUNT(*) AS total FROM screenshots
    `);

    this.countTextsStmt = this.db.prepare(`
      SELECT COUNT(*) AS total FROM texts
    `);

    this.countTagsStmt = this.db.prepare(`
      SELECT COUNT(*) AS total FROM tags
    `);

    this.bySourceStmt = this.db.prepare(`
      SELECT source_app, COUNT(*) AS total
      FROM screenshots
      WHERE source_app IS NOT NULL
      GROUP BY source_app
    `);

    this.recentImportsStmt = this.db.prepare(`
      SELECT COUNT(*) AS total FROM screenshots WHERE imported_at >= ?
    `);
  }

  getDb(): any {
    return this.db;
  }

  close(): void {
    this.db.close();
  }

  private mapRow(row: any): ScreenshotDTO {
    return {
      id: row.id,
      filePath: row.file_path,
      fileHash: row.file_hash,
      createdAt: row.created_at,
      importedAt: row.imported_at,
      width: row.width,
      height: row.height,
      sourceApp: row.source_app,
      mime: row.mime,
      ocrConfidence: row.ocr_confidence,
      summary: row.summary,
    };
  }

  insertScreenshot(s: Screenshot): void {
    this.insertScreenshotStmt.run(
      s.id,
      s.filePath,
      s.fileHash,
      s.createdAt,
      s.importedAt,
      s.width,
      s.height,
      s.sourceApp ?? null,
      s.mime,
      s.ocrConfidence ?? null,
      s.summary ?? null
    );
  }

  insertText(screenshotId: string, content: string): void {
    this.insertTextStmt.run(screenshotId, content);
  }

  updateFTS(screenshotId: string, content: string): void {
    this.insertText(screenshotId, content);
  }

  insertMetadata(screenshotId: string, key: string, value: string): void {
    this.insertMetadataStmt.run(screenshotId, key, value);
  }

  getScreenshot(id: string): ScreenshotDTO | undefined {
    const row = this.getScreenshotStmt.get(id) as any;
    return row ? this.mapRow(row) : undefined;
  }

  getScreenshotDetail(id: string): ScreenshotDetail | undefined {
    const row = this.getScreenshotStmt.get(id) as any;
    if (!row) return undefined;
    const dto = this.mapRow(row);
    const textRow = this.getTextStmt.get(id) as any;
    const tags = this.getTagsForScreenshot(id);
    return {
      ...dto,
      text: textRow?.content ?? '',
      tags,
    };
  }

  getScreenshotByHash(fileHash: string): ScreenshotDTO | undefined {
    const row = this.getByHashStmt.get(fileHash) as any;
    return row ? this.mapRow(row) : undefined;
  }

  searchScreenshots(q: SearchQuery): SearchResponse {
    const limit = q.limit ?? 50;
    const offset = q.offset ?? 0;
    const { clause: filterClause, params: filterParams } = this.buildFilters(q);
    const rawQuery = q.q?.trim() ?? '';

    if (rawQuery.length === 0) {
      return this.searchNoQuery(filterClause, filterParams, limit, offset);
    }

    try {
      const ftsQuery = this.sanitizeFTSQuery(rawQuery);
      if (ftsQuery.length === 0) {
        throw new Error('FTS query contains no usable terms');
      }
      return this.searchFTS(ftsQuery, filterClause, filterParams, limit, offset);
    } catch (err) {
      logger.warn('FTS search failed, falling back to LIKE search on texts.content', err);
      return this.searchLike(rawQuery, filterClause, filterParams, limit, offset);
    }
  }

  private buildFilters(q: SearchQuery): { clause: string; params: any[] } {
    const parts: string[] = [];
    const params: any[] = [];
    if (q.tag) {
      parts.push(
        's.id IN (SELECT st.screenshot_id FROM screenshot_tags st JOIN tags tg ON st.tag_id = tg.id WHERE tg.name = ?)'
      );
      params.push(q.tag);
    }
    if (q.from != null) {
      parts.push('s.created_at >= ?');
      params.push(q.from);
    }
    if (q.to != null) {
      parts.push('s.created_at <= ?');
      params.push(q.to);
    }
    const clause = parts.length > 0 ? 'AND ' + parts.join(' AND ') : '';
    return { clause, params };
  }

  private sanitizeFTSQuery(query: string): string {
    return query
      .split(/[^A-Za-z0-9_]+/)
      .filter((t) => t.length > 0)
      .join(' ');
  }

  private searchFTS(
    ftsQuery: string,
    filterClause: string,
    filterParams: any[],
    limit: number,
    offset: number
  ): SearchResponse {
    const dataSql = `
      SELECT s.*, snippet(texts_fts, 0, '[', ']', '...', 8) AS snippet
      FROM texts_fts
      JOIN texts t ON t.rowid = texts_fts.rowid
      JOIN screenshots s ON s.id = t.screenshot_id
      WHERE texts_fts MATCH ?
      ${filterClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const countSql = `
      SELECT COUNT(*) AS total
      FROM texts_fts
      JOIN texts t ON t.rowid = texts_fts.rowid
      JOIN screenshots s ON s.id = t.screenshot_id
      WHERE texts_fts MATCH ?
      ${filterClause}
    `;
    const dataParams: any[] = [ftsQuery, ...filterParams, limit, offset];
    const countParams: any[] = [ftsQuery, ...filterParams];

    const rows = this.db.prepare(dataSql).all(...dataParams) as any[];
    const totalRow = this.db.prepare(countSql).get(...countParams) as any;
    const total = totalRow?.total ?? 0;

    const screenshots: ScreenshotDTO[] = rows.map((row) => {
      const dto = this.mapRow(row);
      return row.snippet != null ? { ...dto, snippet: row.snippet } : dto;
    });

    return { screenshots, total };
  }

  private searchNoQuery(
    filterClause: string,
    filterParams: any[],
    limit: number,
    offset: number
  ): SearchResponse {
    const dataSql = `
      SELECT s.*
      FROM screenshots s
      LEFT JOIN texts t ON s.id = t.screenshot_id
      WHERE 1=1
      ${filterClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const countSql = `
      SELECT COUNT(*) AS total
      FROM screenshots s
      WHERE 1=1
      ${filterClause}
    `;
    const dataParams: any[] = [...filterParams, limit, offset];
    const countParams: any[] = [...filterParams];

    const rows = this.db.prepare(dataSql).all(...dataParams) as any[];
    const totalRow = this.db.prepare(countSql).get(...countParams) as any;
    const total = totalRow?.total ?? 0;

    const screenshots: ScreenshotDTO[] = rows.map((row) => this.mapRow(row));

    return { screenshots, total };
  }

  private searchLike(
    rawQuery: string,
    filterClause: string,
    filterParams: any[],
    limit: number,
    offset: number
  ): SearchResponse {
    const likePattern = `%${rawQuery}%`;
    const dataSql = `
      SELECT s.*
      FROM screenshots s
      JOIN texts t ON s.id = t.screenshot_id
      WHERE t.content LIKE ?
      ${filterClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const countSql = `
      SELECT COUNT(*) AS total
      FROM screenshots s
      JOIN texts t ON s.id = t.screenshot_id
      WHERE t.content LIKE ?
      ${filterClause}
    `;
    const dataParams: any[] = [likePattern, ...filterParams, limit, offset];
    const countParams: any[] = [likePattern, ...filterParams];

    const rows = this.db.prepare(dataSql).all(...dataParams) as any[];
    const totalRow = this.db.prepare(countSql).get(...countParams) as any;
    const total = totalRow?.total ?? 0;

    const screenshots: ScreenshotDTO[] = rows.map((row) => this.mapRow(row));

    return { screenshots, total };
  }

  deleteScreenshot(id: string): void {
    this.deleteScreenshotStmt.run(id);
  }

  getStats(): StatsResponse {
    const totalScreenshots = (this.countScreenshotsStmt.get() as any)?.total ?? 0;
    const totalWithText = (this.countTextsStmt.get() as any)?.total ?? 0;
    const totalTags = (this.countTagsStmt.get() as any)?.total ?? 0;

    const bySource: Record<string, number> = {};
    const sourceRows = this.bySourceStmt.all() as any[];
    for (const row of sourceRows) {
      bySource[row.source_app] = row.total;
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentImports = (this.recentImportsStmt.get(sevenDaysAgo) as any)?.total ?? 0;

    return {
      totalScreenshots,
      totalWithText,
      totalTags,
      bySource,
      recentImports,
    };
  }

  getAllTags(): string[] {
    const rows = this.getAllTagsStmt.all() as any[];
    return rows.map((r) => r.name);
  }

  getTagsForScreenshot(id: string): string[] {
    const rows = this.getTagsForScreenshotStmt.all(id) as any[];
    return rows.map((r) => r.name);
  }

  setTags(screenshotId: string, tagNames: string[]): void {
    const tx = this.db.transaction(() => {
      this.deleteScreenshotTagsStmt.run(screenshotId);
      for (const name of tagNames) {
        this.insertTagStmt.run(name);
        this.linkTagStmt.run(screenshotId, name);
      }
    });
    tx();
  }

  addTag(screenshotId: string, tagName: string): void {
    this.insertTagStmt.run(tagName);
    this.linkTagStmt.run(screenshotId, tagName);
  }

  removeTag(screenshotId: string, tagName: string): void {
    this.removeTagStmt.run(screenshotId, tagName);
  }
}

let dbManager: DatabaseManager;

export function getDbManager(): DatabaseManager {
  if (!dbManager) {
    dbManager = new DatabaseManager();
  }
  return dbManager;
}