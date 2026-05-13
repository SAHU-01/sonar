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
      <div className="border border-border rounded-xl p-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{fileName || 'Uploaded'}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">{value}</p>
          </div>
          <button
            type="button"
            onClick={() => { onChange(''); setFileName(null); }}
            className="text-xs text-red-400 hover:text-red-300 shrink-0 ml-3"
          >
            Remove
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
      className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent/50 transition-colors"
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
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{fileName} — uploading to Walrus...</p>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{progress}%</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-1">
            Click or drag to upload {label.toLowerCase()}
          </p>
          <p className="text-xs text-muted-foreground">Max {maxSizeMB}MB{accept ? ` — ${accept}` : ''}</p>
        </>
      )}

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
