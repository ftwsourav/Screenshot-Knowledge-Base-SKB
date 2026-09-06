import type { StatsResponse } from '../lib/types';

interface StatsBarProps {
  stats: StatsResponse | null;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard label="Total Screenshots" value={stats ? stats.totalScreenshots : '—'} />
      <StatCard label="With Text" value={stats ? stats.totalWithText : '—'} />
      <StatCard label="Tags" value={stats ? stats.totalTags : '—'} />
      <StatCard label="Recent (7d)" value={stats ? stats.recentImports : '—'} />
    </div>
  );
}