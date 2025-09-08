export interface Screenshot {
  id: string;
  filePath: string;
  fileHash: string;
  createdAt: number;
  importedAt: number;
  width: number;
  height: number;
  sourceApp?: string;
  mime: string;
  ocrConfidence?: number;
  summary?: string;
}

export interface Text {
  screenshotId: string;
  content: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface ScreenshotTag {
  screenshotId: string;
  tagId: number;
}

export interface Metadata {
  screenshotId: string;
  key: string;
  value: string;
}

export interface SearchQuery {
  q?: string;
  tag?: string;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}

export interface ImportResult {
  success: boolean;
  screenshotId?: string;
  error?: string;
}