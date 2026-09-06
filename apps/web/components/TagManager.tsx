import { useState } from 'react';
import { removeTag, setTags } from '../lib/api';

interface TagManagerProps {
  screenshotId: string;
  tags: string[];
  onChanged: () => void;
}

export default function TagManager({ screenshotId, tags, onChanged }: TagManagerProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    const trimmed = value.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setValue('');
      return;
    }
    setBusy(true);
    try {
      await setTags(screenshotId, [...tags, trimmed]);
      setValue('');
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (tag: string) => {
    setBusy(true);
    try {
      await removeTag(screenshotId, tag);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.length === 0 ? (
          <span className="text-xs text-slate-400">No tags yet</span>
        ) : (
          tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs"
            >
              {t}
              <button
                type="button"
                disabled={busy}
                onClick={() => handleRemove(t)}
                className="text-indigo-400 hover:text-indigo-700 disabled:opacity-40"
                aria-label={`Remove tag ${t}`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm flex-1"
          placeholder="Add a tag…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={handleAdd}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}