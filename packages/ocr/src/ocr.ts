import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { logger } from '@skb/common';

export interface OCRResult {
  text: string;
  confidence: number;
}

export class OCRProcessor {
  private worker: Tesseract.Worker | null = null;

  async initialize() {
    if (!this.worker) {
      this.worker = await Tesseract.createWorker('eng');
      logger.info('OCR worker initialized');
    }
  }

  async processImage(imagePath: string): Promise<OCRResult> {
    if (!this.worker) {
      await this.initialize();
    }

    try {
      // Preprocess image: convert to grayscale, enhance contrast
      const processedImage = await sharp(imagePath)
        .greyscale()
        .normalise()
        .png()
        .toBuffer();

      const { data: { text, confidence } } = await this.worker!.recognize(processedImage);

      logger.debug(`OCR completed for ${imagePath}, confidence: ${confidence}`);

      return {
        text: text.trim(),
        confidence
      };
    } catch (error) {
      logger.error(`OCR failed for ${imagePath}:`, error);
      throw error;
    }
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      logger.info('OCR worker terminated');
    }
  }
}

let ocrProcessor: OCRProcessor;

export function getOCRProcessor(): OCRProcessor {
  if (!ocrProcessor) {
    ocrProcessor = new OCRProcessor();
  }
  return ocrProcessor;
}