import Link from 'next/link';
import { getImageUrl } from '../lib/api';
import type { ScreenshotDTO } from '../lib/types';

interface ScreenshotCardProps {
  s: ScreenshotDTO;
}

export default function ScreenshotCard({ s }: ScreenshotCardProps) {
  return (
    <Link
      href={`/screenshot/${s.id}`}
      className="block rounded-lg bg-white border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
    >
      <img
        src={getImageUrl(s.id)}
        alt="Screenshot"
        loading="lazy"
        className="w-full h-40 object-cover bg-slate-100"
      />
      <div className="p-3">
        <div className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</div>
        {s.snippet ? <p className="text-sm text-slate-700 mt-1 line-clamp-2">{s.snippet}</p> : null}
        {s.tags && s.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-2">
            {s.tags.map((t) => (
              <span
                key={t}
                className="inline-block rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}