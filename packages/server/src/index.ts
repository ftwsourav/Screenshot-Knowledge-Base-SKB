import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import sharp from 'sharp';
import chokidar from 'chokidar';
import { config, logger, type Screenshot, type SearchQuery } from '@skb/common';
import { getDbManager } from '@skb/db';
import { getOCRProcessor } from '@skb/ocr';
import { getSearchService } from '@skb/search';

// Apply configured log level before any service initializes (singletons log on startup)
logger.setLevel(config.logLevel);

// ---------------------------------------------------------------------------
// Singletons
// ---------------------------------------------------------------------------
const dbManager = getDbManager();
const ocrProcessor = getOCRProcessor();
const searchService = getSearchService();

// Ensure the images directory exists (static root + multer destination)
if (!fs.existsSync(config.imagesPath)) {
  fs.mkdirSync(config.imagesPath, { recursive: true });
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
const upload = multer({ dest: config.imagesPath });

app.use(cors());
app.use(express.json());

// Serve stored screenshots over HTTP
app.use('/images', express.static(config.imagesPath));

// Map sharp's format identifier to a mime type (fallback to png)
const MIME_BY_FORMAT: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

// ---------------------------------------------------------------------------
// Core import pipeline: hash -> dedup -> copy/move -> OCR -> persist
// ---------------------------------------------------------------------------
async function processAndStoreFile(
  filePath: string,
  originalName?: string
): Promise<{ id: string; duplicate: boolean }> {
  try {
    // 1. Content hash for deduplication
    const buffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // 2. Dedup: return existing record if we already have this image
    const existing = dbManager.getScreenshotByHash(hash);
    if (existing) {
      return { id: existing.id, duplicate: true };
    }

    // 3. Image metadata (dimensions + mime)
    const meta = await sharp(filePath).metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    const mime = MIME_BY_FORMAT[meta.format || ''] || 'image/png';

    // 4. Unique id + destination path
    const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const ext = path.extname(originalName || filePath) || '.' + (meta.format || 'png');
    const newPath = path.join(config.imagesPath, `${id}${ext}`);

    // 5. Place the file. Uploads (originalName set) are multer temp files -> move.
    //    Watcher-discovered files have no originalName -> copy to keep the source.
    if (originalName) {
      fs.renameSync(filePath, newPath);
    } else {
      fs.copyFileSync(filePath, newPath);
    }

    // 6. OCR the stored copy
    const ocr = await ocrProcessor.processImage(newPath);

    // 7. Persist screenshot + extracted text
    const createdAt =
      (fs.statSync(newPath).birthtime || new Date()).getTime() || Date.now();
    const screenshot: Screenshot = {
      id,
      filePath: newPath,
      fileHash: hash,
      createdAt,
      importedAt: Date.now(),
      width,
      height,
      sourceApp: undefined,
      mime,
      ocrConfidence: ocr.confidence,
    };
    dbManager.insertScreenshot(screenshot);
    dbManager.insertText(id, ocr.text);
    // FTS auto-syncs via trigger; keep the index in sync explicitly as a safety net
    searchService.updateFTS(id, ocr.text);

    return { id, duplicate: false };
  } catch (error) {
    logger.error(`processAndStoreFile failed for ${filePath}:`, error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// File watcher (auto-import of screenshots dropped into watched folders)
// ---------------------------------------------------------------------------
const IMAGE_EXT = /\.(png|jpe?g|gif|bmp|webp|tiff?)$/i;

const watcher = chokidar.watch([], {
  persistent: true,
  ignoreInitial: true,
  ignored: [config.imagesPath],
});

watcher.on('add', async (filePath: string) => {
  if (!IMAGE_EXT.test(filePath)) return;
  if (filePath.startsWith(config.imagesPath)) return;
  logger.info(`New file detected: ${filePath}`);
  try {
    await processAndStoreFile(filePath);
  } catch (error) {
    logger.error(`Watcher import failed for ${filePath}:`, error);
  }
});

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

// --- Import -------------------------------------------------------------

app.post('/api/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const result = await processAndStoreFile(req.file.path, req.file.originalname);
    res.json({ success: true, screenshotId: result.id, duplicate: result.duplicate });
  } catch (error) {
    logger.error('Import failed:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

app.post('/api/import/folder', (req, res) => {
  try {
    const { path: folderPath } = req.body as { path?: string };
    if (!folderPath || !fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      return res.status(400).json({ error: 'Invalid folder path' });
    }
    watcher.add(folderPath);
    res.json({ success: true });
  } catch (error) {
    logger.error('Folder import failed:', error);
    res.status(500).json({ error: 'Failed to watch folder' });
  }
});

// --- Search / list ------------------------------------------------------

function searchHandler(req: Request, res: Response) {
  try {
    const query: SearchQuery = {
      q: req.query.q ? String(req.query.q) : undefined,
      tag: req.query.tag ? String(req.query.tag) : undefined,
      from: req.query.from ? parseInt(String(req.query.from), 10) : undefined,
      to: req.query.to ? parseInt(String(req.query.to), 10) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 50,
      offset: req.query.offset ? parseInt(String(req.query.offset), 10) : 0,
    };
    const results = searchService.search(query);
    res.json(results);
  } catch (error) {
    logger.error('Search failed:', error);
    res.status(500).json({ error: 'Search failed' });
  }
}

app.get('/api/screenshots', searchHandler);
app.get('/api/search', searchHandler);

// --- Single screenshot --------------------------------------------------

app.get('/api/screenshots/:id', (req, res) => {
  try {
    const detail = dbManager.getScreenshotDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(detail);
  } catch (error) {
    logger.error('Get screenshot failed:', error);
    res.status(500).json({ error: 'Failed to get screenshot' });
  }
});

app.get('/api/screenshots/:id/image', (req, res) => {
  try {
    const s = dbManager.getScreenshot(req.params.id);
    if (!s) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.setHeader('Content-Type', s.mime || 'image/png');
    const stream = fs.createReadStream(s.filePath);
    stream.on('error', (err) => {
      logger.error(`Failed to stream image ${s.filePath}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to read image' });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  } catch (error) {
    logger.error('Image stream failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to read image' });
    }
  }
});

app.delete('/api/screenshots/:id', (req, res) => {
  try {
    const s = dbManager.getScreenshot(req.params.id);
    dbManager.deleteScreenshot(req.params.id);
    if (s && s.filePath) {
      try {
        fs.unlinkSync(s.filePath);
      } catch {
        // File may already be gone; ignore
      }
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete failed:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// --- Reindex ------------------------------------------------------------

app.post('/api/reindex/:id', async (req, res) => {
  try {
    const s = dbManager.getScreenshotDetail(req.params.id);
    if (!s) {
      return res.status(404).json({ error: 'Not found' });
    }
    const ocr = await ocrProcessor.processImage(s.filePath);
    dbManager.insertText(req.params.id, ocr.text);
    searchService.updateFTS(req.params.id, ocr.text);
    res.json({ success: true, ocrConfidence: ocr.confidence });
  } catch (error) {
    logger.error('Reindex failed:', error);
    res.status(500).json({ error: 'Reindex failed' });
  }
});

// --- Tags ---------------------------------------------------------------

app.get('/api/tags', (req, res) => {
  try {
    res.json({ tags: dbManager.getAllTags() });
  } catch (error) {
    logger.error('Get tags failed:', error);
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

app.post('/api/screenshots/:id/tags', (req, res) => {
  try {
    const { tags } = req.body as { tags?: string[] };
    dbManager.setTags(req.params.id, tags || []);
    res.json({ tags: dbManager.getTagsForScreenshot(req.params.id) });
  } catch (error) {
    logger.error('Set tags failed:', error);
    res.status(500).json({ error: 'Failed to set tags' });
  }
});

app.delete('/api/screenshots/:id/tags/:tag', (req, res) => {
  try {
    dbManager.removeTag(req.params.id, req.params.tag);
    res.json({ tags: dbManager.getTagsForScreenshot(req.params.id) });
  } catch (error) {
    logger.error('Remove tag failed:', error);
    res.status(500).json({ error: 'Failed to remove tag' });
  }
});

// --- Stats --------------------------------------------------------------

app.get('/api/stats', (req, res) => {
  try {
    res.json(dbManager.getStats());
  } catch (error) {
    logger.error('Stats failed:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ---------------------------------------------------------------------------
// Start + graceful shutdown
// ---------------------------------------------------------------------------
app.listen(config.port, () =>
  logger.info(`SKB server running on http://localhost:${config.port}`)
);

process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  try {
    await ocrProcessor.terminate();
  } catch {}
  try {
    await watcher.close();
  } catch {}
  try {
    dbManager.close();
  } catch {}
  process.exit(0);
});