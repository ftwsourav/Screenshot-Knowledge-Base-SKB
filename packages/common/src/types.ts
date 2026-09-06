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

export interface ScreenshotDTO {
  id: string;
  filePath: string;
  fileHash: string;
  createdAt: number;
  importedAt: number;
  width: number;
  height: number;
  sourceApp?: string;
  mime?: string;
  ocrConfidence?: number;
  summary?: string;
  snippet?: string;
  tags?: string[];
}

export interface SearchResponse {
  screenshots: ScreenshotDTO[];
  total: number;
}

export interface ScreenshotDetail {
  id: string;
  filePath: string;
  fileHash: string;
  createdAt: number;
  importedAt: number;
  width: number;
  height: number;
  sourceApp?: string;
  mime?: string;
  ocrConfidence?: number;
  summary?: string;
  text?: string;
  tags: string[];
}

export interface StatsResponse {
  totalScreenshots: number;
  totalWithText: number;
  totalTags: number;
  bySource: Record<string, number>;
  recentImports: number;
}

export interface TagListResponse {
  tags: string[];
}

export interface ApiResult {
  success: boolean;
  screenshotId?: string;
  duplicate?: boolean;
  error?: string;
}
