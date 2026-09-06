import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { deleteScreenshot, getImageUrl, getScreenshot, reindex } from '../../lib/api';
import type { ScreenshotDetail } from '../../lib/types';
import TagManager from '../../components/TagManager';

export default function ScreenshotPage() {
  const router = useRouter();
  const { id } = router.query;

  const [s, setS] = useState<ScreenshotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    if (typeof id !== 'string') return;
    setLoading(true);
    setError(null);
    try {
      const data = await getScreenshot(id);
      setS(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load screenshot');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router.isReady]);

  const handleReindex = async () => {
    if (typeof id !== 'string') return;
    setBusy(true);
    try {
      await reindex(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-OCR failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (typeof id !== 'string') return;
    if (!confirm('Delete this screenshot?')) return;
    setBusy(true);
    try {
      await deleteScreenshot(id);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(s?.text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  if (loading && !s) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error || !s) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-3">ðŸ”</div>
        <p className="text-slate-600">Screenshot not found</p>
        <Link href="/" className="mt-4 text-indigo-600 hover:underline">
          â† Back to gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7">
        <img
          src={getImageUrl(String(id))}
          alt="Screenshot"
          className="max-h-[70vh] mx-auto rounded-lg shadow border border-slate-200"
        />
      </div>

      <div className="lg:col-span-5 space-y-5">
        <div>
          <Link href="/" className="text-indigo-600 hover:underline text-sm">
            â† Back to gallery
          </Link>
        </div>

        <div className="rounded-lg bg-white border border-slate-200 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Metadata</h2>
          <dl className="grid grid-cols-3 gap-y-2 text-sm">
            <dt className="text-slate-500">Dimensions</dt>
            <dd className="col-span-2 text-slate-900">{s.width}Ã—{s.height}</dd>
            <dt className="text-slate-500">MIME</dt>
            <dd className="col-span-2 text-slate-900">{s.mime || 'â€”'}</dd>
            <dt className="text-slate-500">OCR Confidence</dt>
            <dd className="col-span-2 text-slate-900">{Math.round(s.ocrConfidence || 0)}%</dd>
            <dt className="text-slate-500">Source</dt>
            <dd className="col-span-2 text-slate-900">{s.sourceApp || 'Unknown'}</dd>
            <dt className="text-slate-500">Created</dt>
            <dd className="col-span-2 text-slate-900">{new Date(s.createdAt).toLocaleString()}</dd>
            <dt className="text-slate-500">Imported</dt>
            <dd className="col-span-2 text-slate-900">{new Date(s.importedAt).toLocaleString()}</dd>
            <dt className="text-slate-500">Hash</dt>
            <dd className="col-span-2 text-slate-900 font-mono text-xs">{s.fileHash.slice(0, 12)}â€¦</dd>
          </dl>
        </div>

        <div className="rounded-lg bg-white border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-700">OCR Text</h2>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-100"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          {s.text ? (
            <div className="whitespace-pre-wrap break-words text-sm text-slate-700 max-h-64 overflow-auto thin-scrollbar">
              {s.text}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No OCR text available.</p>
          )}
        </div>

        <div className="rounded-lg bg-white border border-slate-200 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Tags</h2>
          <TagManager screenshotId={String(id)} tags={s.tags} onChanged={load} />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleReindex}
            className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-40"
          >
            Re-OCR
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="px-3 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}