/**
 * ResponseDetail: slide-out drawer showing full submission details.
 * Renders uploaded images/videos inline from Walrus aggregator.
 * Shows Walrus blob link, Sui tx, and raw JSON.
 */
'use client';

const AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';

interface ResponseDetailProps {
  submission: {
    blobId: string;
    submitter: string;
    timestamp: string;
    txDigest?: string;
    data: Record<string, unknown> | null;
  } | null;
  fields: Array<{ id: string; label: string; type: string }>;
  onClose: () => void;
}

export function ResponseDetail({ submission, fields, onClose }: ResponseDetailProps) {
  if (!submission) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 w-full sm:max-w-2xl bg-background border-l-4 border-border-strong z-50 overflow-y-auto selection:bg-cta">
        <div className="p-8 sm:p-12">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl">response detail</h2>
            <button onClick={onClose} className="neo-btn bg-card w-12 h-12 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
            </button>
          </div>

          {/* Meta */}
          <div className="neo-card bg-card p-8 mb-12 shadow-brutal space-y-6">
            <MetaRow label="timestamp" value={submission.timestamp ? new Date(submission.timestamp).toLocaleString() : '-'} />
            <MetaRow label="submitter" value={submission.submitter} mono />
            <MetaRow label="walrus blob" value={submission.blobId} mono link={`${AGGREGATOR}/v1/blobs/${submission.blobId}`} />
            {submission.txDigest && <MetaRow label="sui transaction" value={submission.txDigest} mono />}
          </div>

          {/* Field responses */}
          <h3 className="text-2xl mb-6">responses</h3>
          {submission.data ? (
            <div className="space-y-6">
              {fields.filter(f => !['section_header', 'description_block'].includes(f.type)).map((field) => {
                const value = submission.data?.[field.id];
                return (
                  <div key={field.id} className="neo-card bg-card p-6 shadow-brutal-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 ml-1">{field.label}</p>
                    <FieldValue value={value} fieldType={field.type} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="neo-card bg-warning p-10 text-center font-black lowercase shadow-brutal-sm">
              unable to load response data
            </div>
          )}

          {/* Raw JSON */}
          <h3 className="text-2xl mt-16 mb-6">raw json</h3>
          <pre className="neo-card bg-card-cream p-6 text-xs font-mono font-bold text-foreground/60 overflow-x-auto max-h-80 shadow-none border-dashed">
            {JSON.stringify(submission.data, null, 2)}
          </pre>

          <button onClick={onClose} className="w-full neo-btn bg-cta text-cta-foreground py-4 text-sm mt-12 mb-8">
            close drawer
          </button>
        </div>
      </div>
    </>
  );
}

function FieldValue({ value, fieldType }: { value: unknown; fieldType: string }) {
  if (value === undefined || value === null || value === '') {
    return <span className="text-sm font-bold opacity-30 lowercase italic">no response</span>;
  }

  const strValue = String(value);

  // Image: render inline from Walrus
  if (fieldType === 'image_upload' && strValue) {
    return (
      <div className="space-y-4">
        <img
          src={`${AGGREGATOR}/v1/blobs/${strValue}`}
          alt="Uploaded image"
          className="max-w-full neo-card shadow-brutal-sm max-h-80 object-contain bg-muted"
        />
        <BlobLink blobId={strValue} label="view full image" />
      </div>
    );
  }

  // Video: render inline with player
  if (fieldType === 'video_upload' && strValue) {
    return (
      <div className="space-y-4">
        <video
          src={`${AGGREGATOR}/v1/blobs/${strValue}`}
          controls
          className="max-w-full neo-card shadow-brutal-sm max-h-80 bg-muted"
        />
        <BlobLink blobId={strValue} label="download video" />
      </div>
    );
  }

  // File: download link
  if (fieldType === 'file_upload' && strValue) {
    return <BlobLink blobId={strValue} label="download file" />;
  }

  // Star rating: render stars
  if (fieldType === 'star_rating') {
    const num = Number(strValue);
    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={`text-2xl ${i < num ? 'text-warning' : 'opacity-10'}`}>&#9733;</span>
          ))}
        </div>
        <span className="text-sm font-black opacity-30 lowercase ml-2">{num}/5</span>
      </div>
    );
  }

  // Arrays (multi-select, checkboxes)
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((v, i) => (
          <span key={i} className="neo-card bg-accent px-3 py-1 text-xs font-bold lowercase shadow-none border-border-strong/20">{String(v)}</span>
        ))}
      </div>
    );
  }

  // Default text
  return <p className="text-lg font-bold lowercase leading-tight">{strValue}</p>;
}

function BlobLink({ blobId, label }: { blobId: string; label: string }) {
  return (
    <a
      href={`${AGGREGATOR}/v1/blobs/${blobId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="neo-btn-cta text-cta-foreground px-4 py-2 text-[10px] inline-flex items-center gap-2 shadow-brutal-sm"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 1H2.5A1.5 1.5 0 001 2.5v7A1.5 1.5 0 002.5 11h7A1.5 1.5 0 0011 9.5V7" />
        <path d="M7 1h4v4M4.5 7.5L11 1" />
      </svg>
      {label}
      <span className="opacity-40 font-mono">{blobId.slice(0, 8)}...</span>
    </a>
  );
}

function MetaRow({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  return (
    <div className="border-b-2 border-border-strong/5 pb-4 last:border-0 last:pb-0">
      <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">{label}</p>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className={`text-base font-black text-accent hover:underline break-all ${mono ? 'font-mono text-xs' : ''}`}>
          {value}
        </a>
      ) : (
        <p className={`text-base font-bold break-all lowercase ${mono ? 'font-mono text-xs opacity-60' : ''}`}>{value}</p>
      )}
    </div>
  );
}
