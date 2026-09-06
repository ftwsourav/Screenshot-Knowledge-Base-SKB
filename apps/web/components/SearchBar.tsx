interface SearchBarProps {
  q: string;
  tag: string;
  from: string;
  to: string;
  tags: string[];
  onQ: (v: string) => void;
  onTag: (v: string) => void;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onSearch: () => void;
}

export default function SearchBar(props: SearchBarProps) {
  const { q, tag, from, to, tags, onQ, onTag, onFrom, onTo, onSearch } = props;
  const inputCls = 'border border-slate-300 rounded-md px-3 py-2 text-sm';
  return (
    <div className="flex flex-wrap gap-2 items-end mb-4">
      <div className="flex flex-col">
        <label className="text-xs text-slate-500 mb-1">Query</label>
        <input
          type="text"
          className={inputCls}
          placeholder="Search OCR text…"
          value={q}
          onChange={(e) => onQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch();
          }}
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-slate-500 mb-1">Tag</label>
        <select className={inputCls} value={tag} onChange={(e) => onTag(e.target.value)}>
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-slate-500 mb-1">From</label>
        <input type="date" className={inputCls} value={from} onChange={(e) => onFrom(e.target.value)} />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-slate-500 mb-1">To</label>
        <input type="date" className={inputCls} value={to} onChange={(e) => onTo(e.target.value)} />
      </div>
      <button
        type="button"
        onClick={onSearch}
        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
      >
        Search
      </button>
    </div>
  );
}