import { useRef, useState } from 'react';
import { uploadFile } from '../lib/api';

interface UploadDropzoneProps {
  onUploaded: () => void;
}

interface FileStatus {
  name: string;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

export default function UploadDropzone({ onUploaded }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [statuses, setStatuses] = useState<FileStatus[]>([]);
  const [dragging, setDragging] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    const initial: FileStatus[] = fileArr.map((f) => ({ name: f.name, status: 'uploading' }));
    setStatuses(initial);

    await Promise.all(
      fileArr.map(async (file, idx) => {
        try {
          await uploadFile(file);
          setStatuses((prev) => prev.map((s, i) => (i === idx ? { ...s, status: 'done' } : s)));
        } catch (err) {
          setStatuses((prev) =>
            prev.map((s, i) =>
              i === idx
                ? { ...s, status: 'error', error: err instanceof Error ? err.message : 'Failed' }
                : s,
            ),
          );
        }
      }),
    );

    onUploaded();
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer ${
          dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div className="text-sm text-slate-600">
          <span className="text-2xl block mb-1">⬆️</span>
          Click or drag &amp; drop images to upload
        </div>
      </div>

      {statuses.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs">
          {statuses.map((st, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="truncate flex-1 text-slate-700">{st.name}</span>
              <span
                className={
                  st.status === 'done'
                    ? 'text-green-600'
                    : st.status === 'error'
                    ? 'text-red-600'
                    : 'text-slate-500'
                }
              >
                {st.status === 'done' ? 'Done' : st.status === 'error' ? `Error: ${st.error}` : 'Uploading…'}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}