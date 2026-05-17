/**
 * WalrusUpload: file upload component that uploads directly to Walrus publisher.
 * Shows drag-and-drop zone, progress bar, and blob ID after upload.
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import { PUBLISHER_URL } from '@/lib/walrus';

interface WalrusUploadProps {
  accept?: string;
  maxSizeMB?: number;
  label: string;
  value?: string;
  onChange: (blobId: string) => void;
}

export function WalrusUpload({ accept, maxSizeMB = 10, label, value, onChange }: WalrusUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);
    setFileName(file.name);

    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      const blobId = await new Promise<string>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const json = JSON.parse(xhr.responseText);
            const id = json.newlyCreated?.blobObject?.blobId || json.alreadyCertified?.blobId;
            if (id) resolve(id);
            else reject(new Error('No blobId in response'));
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('PUT', `${PUBLISHER_URL}/v1/blobs`);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.send(file);
      });

      onChange(blobId);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [maxSizeMB, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (value) {
    return (
      <div className="neo-card bg-card p-6 shadow-brutal-sm">
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-lg font-black truncate lowercase leading-none mb-2">{fileName || 'uploaded file'}</p>
            <p className="text-xs font-mono font-bold opacity-30 truncate">{value}</p>
          </div>
          <button
            type="button"
            onClick={() => { onChange(''); setFileName(null); }}
            className="neo-btn bg-destructive px-4 py-1.5 text-[10px] text-white"
          >
            remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className="neo-card bg-card-cream border-dashed border-4 border-border-strong/20 p-12 text-center cursor-pointer hover:border-accent hover:bg-card transition-all group shadow-none"
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {uploading ? (
        <div className="space-y-6">
          <p className="text-sm font-black lowercase opacity-60 group-hover:opacity-100">{fileName} — uploading to walrus...</p>
          <div className="w-full neo-card bg-muted h-6 overflow-hidden shadow-brutal-sm">
            <div className="bg-cta h-full border-r-4 border-border-strong transition-all flex items-center justify-end px-2" style={{ width: `${progress}%` }}>
              {progress > 20 && <span className="text-[10px] font-black text-cta-foreground">{progress}%</span>}
            </div>
          </div>
          <p className="text-xs font-black uppercase tracking-widest opacity-40">{progress}% complete</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-muted border-2 border-border-strong flex items-center justify-center mx-auto mb-6 shadow-brutal-sm group-hover:bg-accent group-hover:-translate-y-1 transition-all">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <p className="text-lg font-black lowercase opacity-60 group-hover:opacity-100">
            click or drag to upload {label.toLowerCase()}
          </p>
          <p className="text-xs font-black uppercase tracking-widest opacity-20">max {maxSizeMB}mb{accept ? ` — ${accept.split(',').join(' ')}` : ''}</p>
        </div>
      )}

      {error && (
        <div className="mt-6 neo-card bg-destructive/10 p-4 border-destructive/50 text-destructive text-xs font-black lowercase">
          {error}
        </div>
      )}
    </div>
  );
}
