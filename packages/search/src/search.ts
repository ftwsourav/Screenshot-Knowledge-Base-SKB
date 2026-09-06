import { getDbManager } from '@skb/db';
import type { SearchQuery, SearchResponse } from '@skb/common';

export class SearchService {
  private dbManager = getDbManager();

  search(query: SearchQuery): SearchResponse {
    return this.dbManager.searchScreenshots(query);
  }

  updateFTS(screenshotId: string, content: string): void {
    this.dbManager.updateFTS(screenshotId, content);
  }
}

let searchService: SearchService;
export function getSearchService(): SearchService {
  if (!searchService) searchService = new SearchService();
  return searchService;
}