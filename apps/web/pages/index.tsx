import { useCallback, useEffect, useState } from 'react';
import { getStats, getTags, listScreenshots } from '../lib/api';
import type { ScreenshotDTO, StatsResponse } from '../lib/types';
import StatsBar from '../components/StatsBar';
import SearchBar from '../components/SearchBar';
import ScreenshotGrid from '../components/ScreenshotGrid';
import UploadDropzone from '../components/UploadDropzone';
import WatchFolder from '../components/WatchFolder';
import Pagination from '../components/Pagination';

const LIMIT = 24;

export default function Home() {
  const [screenshots, setScreenshots] = useState<ScreenshotDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    getStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const loadTags = useCallback(() => {
    getTags()
      .then(setTags)
      .catch(() => {});
  }, []);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listScreenshots({
        q: q || undefined,
        tag: tag || undefined,
        from: from ? Date.parse(from + 'T00:00:00') : undefined,
        to: to ? Date.parse(to + 'T23:59:59') : undefined,
        limit: LIMIT,
        offset,
      });
      setScreenshots(res.screenshots);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load screenshots');
    } finally {
      setLoading(false);
    }
  }, [q, tag, from, to, offset]);

  useEffect(() => {
    loadStats();
    loadTags();
  }, [loadStats, loadTags]);

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  const handleUploaded = useCallback(() => {
    loadStats();
    runSearch();
  }, [loadStats, runSearch]);

  return (
    <div>
      <StatsBar stats={stats} />
      <SearchBar
        q={q}
        tag={tag}
        from={from}
        to={to}
        tags={tags}
        onQ={setQ}
        onTag={setTag}
        onFrom={setFrom}
        onTo={setTo}
        onSearch={runSearch}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <UploadDropzone onUploaded={handleUploaded} />
        <div className="flex items-start">
          <WatchFolder onWatched={handleUploaded} />
        </div>
      </div>
      {error ? (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}
      <ScreenshotGrid screenshots={screenshots} loading={loading} />
      <Pagination total={total} limit={LIMIT} offset={offset} onOffset={setOffset} />
    </div>
  );
}