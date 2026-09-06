import { useState } from 'react';
import { watchFolder } from '../lib/api';

interface WatchFolderProps {
  onWatched?: () => void;
}

export default function WatchFolder({ onWatched }: WatchFolderProps) {
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    const path = window.prompt('Enter folder path to watch:', '');
    if (!path) return;
    setBusy(true);
    setMessage(null);
    try {
      await watchFolder(path);
      setMessage({ text: 'Watching folder.', kind: 'success' });
      onWatched?.();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to watch folder',
        kind: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        className="bg-slate-700 text-white px-3 py-2 rounded-md text-sm hover:bg-slate-800 disabled:opacity-40"
      >
        📂 Watch Folder
      </button>
      {message ? (
        <div
          className={`mt-2 text-xs ${message.kind === 'success' ? 'text-green-600' : 'text-red-600'}`}
        >
          {message.text}
        </div>
      ) : null}
    </div>
  );
}