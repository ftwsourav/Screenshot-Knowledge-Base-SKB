import express from 'express';
import cors from 'cors';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { config, logger } from '@skb/common';
import { getDbManager } from '@skb/db';
import { getOCRProcessor } from '@skb/ocr';
import { getSearchService } from '@skb/search';
import chokidar from 'chokidar';

const app = express();
const upload = multer({ dest: config.imagesPath });

app.use(cors());
app.use(express.json());

// Initialize services
const dbManager = getDbManager();
const ocrProcessor = getOCRProcessor();
const searchService = getSearchService();

// Ensure images directory exists
if (!fs.existsSync(config.imagesPath)) {
  fs.mkdirSync(config.imagesPath, { recursive: true });
}

// API Routes
app.post('/api/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const mime = req.file.mimetype;

    // Generate ID and move file
    const id = Date.now().toString();
    const ext = path.extname(originalName);
    const newPath = path.join(config.imagesPath, `${id}${ext}`);
    fs.renameSync(filePath, newPath);

    // Get image dimensions (simplified)
    const stats = fs.statSync(newPath);
    const width = 1920; // TODO: get actual dimensions
    const height = 1080;

    // OCR
    const ocrResult = await ocrProcessor.processImage(newPath);

    // Store in DB
    const screenshot = {
      id,
      filePath: newPath,
      fileHash: '', // TODO: compute hash
      createdAt: stats.birthtime.getTime(),
      importedAt: Date.now(),
      width,
      height,
      sourceApp: req.body.sourceApp,
      mime,
      ocrConfidence: ocrResult.confidence
    };

    dbManager.insertScreenshot(screenshot);
    dbManager.insertText(id, ocrResult.text);
    searchService.updateFTS(id, ocrResult.text);

    res.json({ success: true, screenshotId: id });
  } catch (error) {
    logger.error('Import failed:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

app.get('/api/screenshots', (req, res) => {
  try {
    const query = {
      q: req.query.q as string,
      tag: req.query.tag as string,
      from: req.query.from ? parseInt(req.query.from as string) : undefined,
      to: req.query.to ? parseInt(req.query.to as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const results = searchService.search(query);
    res.json(results);
  } catch (error) {
    logger.error('Search failed:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/screenshots/:id', (req, res) => {
  try {
    const screenshot = dbManager.getScreenshot(req.params.id);
    if (!screenshot) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }
    res.json(screenshot);
  } catch (error) {
    logger.error('Get screenshot failed:', error);
    res.status(500).json({ error: 'Failed to get screenshot' });
  }
});

// File watcher for folder import
const watcher = chokidar.watch([], {
  persistent: true,
  ignoreInitial: true
});

watcher.on('add', async (filePath) => {
  logger.info(`New file detected: ${filePath}`);
  // TODO: Process new files
});

app.post('/api/import/folder', (req, res) => {
  const { path: folderPath } = req.body;
  if (!folderPath || !fs.existsSync(folderPath)) {
    return res.status(400).json({ error: 'Invalid folder path' });
  }

  watcher.add(folderPath);
  res.json({ success: true });
});

app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await ocrProcessor.terminate();
  dbManager.close();
  process.exit(0);
});