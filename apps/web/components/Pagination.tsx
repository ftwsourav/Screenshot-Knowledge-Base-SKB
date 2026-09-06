interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onOffset: (n: number) => void;
}

export default function Pagination({ total, limit, offset, onOffset }: PaginationProps) {
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);
  const prevDisabled = offset === 0;
  const nextDisabled = offset + limit >= total;

  return (
    <div className="flex items-center justify-between mt-6">
      <div className="text-sm text-slate-500">
        Showing {start}–{end} of {total}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={prevDisabled}
          onClick={() => onOffset(Math.max(0, offset - limit))}
          className="px-3 py-1.5 rounded-md border border-slate-300 text-sm disabled:opacity-40 hover:bg-slate-100"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={nextDisabled}
          onClick={() => onOffset(offset + limit)}
          className="px-3 py-1.5 rounded-md border border-slate-300 text-sm disabled:opacity-40 hover:bg-slate-100"
        >
          Next
        </button>
      </div>
    </div>
  );
}