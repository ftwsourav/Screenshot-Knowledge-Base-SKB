import axios from 'axios';
import type { StatsResponse, SearchResponse, ScreenshotDetail } from '@skb/common';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5656';

export const api = axios.create({ baseURL: API });

export async function getStats(): Promise<StatsResponse> {
  const res = await api.get<StatsResponse>('/api/stats');
  return res.data;
}

export async function listScreenshots(params: {
  q?: string;
  tag?: string;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}): Promise<SearchResponse> {
  const res = await api.get<SearchResponse>('/api/screenshots', { params });
  return res.data;
}

export async function getScreenshot(id: string): Promise<ScreenshotDetail> {
  const res = await api.get<ScreenshotDetail>(`/api/screenshots/${id}`);
  return res.data;
}

export function getImageUrl(id: string): string {
  return `${API}/api/screenshots/${id}/image`;
}

export async function getTags(): Promise<string[]> {
  const res = await api.get<{ tags: string[] }>('/api/tags');
  return res.data.tags;
}

export async function setTags(id: string, tags: string[]): Promise<string[]> {
  const res = await api.post<{ tags: string[] }>(`/api/screenshots/${id}/tags`, { tags });
  return res.data.tags;
}

export async function removeTag(id: string, tag: string): Promise<string[]> {
  const res = await api.delete<{ tags: string[] }>(`/api/screenshots/${id}/tags/${encodeURIComponent(tag)}`);
  return res.data.tags;
}

export async function reindex(id: string): Promise<{ success: boolean; ocrConfidence: number }> {
  const res = await api.post<{ success: boolean; ocrConfidence: number }>(`/api/reindex/${id}`);
  return res.data;
}

export async function deleteScreenshot(id: string): Promise<{ success: boolean }> {
  const res = await api.delete<{ success: boolean }>(`/api/screenshots/${id}`);
  return res.data;
}

export async function uploadFile(file: File): Promise<{ success: boolean; screenshotId: string; duplicate: boolean }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<{ success: boolean; screenshotId: string; duplicate: boolean }>(
    '/api/import',
    formData,
  );
  return res.data;
}

export async function watchFolder(path: string): Promise<{ success: boolean }> {
  const res = await api.post<{ success: boolean }>('/api/import/folder', { path });
  return res.data;
}