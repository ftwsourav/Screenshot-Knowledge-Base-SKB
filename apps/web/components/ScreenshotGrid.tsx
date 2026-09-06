import type { ScreenshotDTO } from '../lib/types';
import ScreenshotCard from './ScreenshotCard';

interface ScreenshotGridProps {
  screenshots: ScreenshotDTO[];
  loading: boolean;
}

function SkeletonCard() {
  return (
    <div className="rounded-lg bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="w-full h-40 bg-slate-200 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-1/3 bg-slate-200 rounded animate-pulse" />
        <div className="h-3 w-full bg-slate-200 rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-slate-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function ScreenshotGrid({ screenshots, loading }: ScreenshotGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (screenshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <div className="text-5xl mb-3">🖼️</div>
        <p className="text-sm">No screenshots found. Upload some to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {screenshots.map((s) => (
        <ScreenshotCard key={s.id} s={s} />
      ))}
    </div>
  );
}