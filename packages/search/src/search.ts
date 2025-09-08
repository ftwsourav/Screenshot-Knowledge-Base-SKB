import { getDbManager } from '@skb/db';
import { SearchQuery } from '@skb/common';
import { logger } from '@skb/common';

export class SearchService {
  private dbManager = getDbManager();

  search(query: SearchQuery) {
    const db = this.dbManager.getDb();

    let sql = `
      SELECT s.*, t.content as text_content
      FROM screenshots s
      LEFT JOIN texts t ON s.id = t.screenshot_id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (query.q) {
      // FTS search
      sql = `
        SELECT s.*, snippet(texts_fts, 0, '[', ']', '...', 8) as snippet, t.content as text_content
        FROM texts_fts
        JOIN texts t ON t.rowid = texts_fts.rowid
        JOIN screenshots s ON s.id = t.screenshot_id
        WHERE texts_fts MATCH ?
      `;
      params.push(query.q);
    }

    if (query.tag) {
      if (query.q) {
        sql += `
          AND s.id IN (
            SELECT st.screenshot_id
            FROM screenshot_tags st
            JOIN tags tg ON st.tag_id = tg.id
            WHERE tg.name = ?
          )
        `;
      } else {
        sql += `
          JOIN screenshot_tags st ON s.id = st.screenshot_id
          JOIN tags tg ON st.tag_id = tg.id
        `;
        conditions.push('tg.name = ?');
      }
      params.push(query.tag);
    }

    if (query.from) {
      conditions.push('s.created_at >= ?');
      params.push(query.from);
    }

    if (query.to) {
      conditions.push('s.created_at <= ?');
      params.push(query.to);
    }

    if (conditions.length > 0 && !query.q) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY s.created_at DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    logger.debug('Search SQL:', sql, params);

    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }

  // Update FTS index after OCR
  updateFTS(screenshotId: string, content: string) {
    const db = this.dbManager.getDb();

    // Insert or replace text
    const insertText = db.prepare(`
      INSERT OR REPLACE INTO texts (screenshot_id, content) VALUES (?, ?)
    `);
    insertText.run(screenshotId, content);

    // Update FTS
    const updateFTS = db.prepare(`
      INSERT OR REPLACE INTO texts_fts (rowid, content)
      SELECT rowid, content FROM texts WHERE screenshot_id = ?
    `);
    updateFTS.run(screenshotId);

    logger.debug(`FTS updated for screenshot ${screenshotId}`);
  }
}

let searchService: SearchService;

export function getSearchService(): SearchService {
  if (!searchService) {
    searchService = new SearchService();
  }
  return searchService;
}