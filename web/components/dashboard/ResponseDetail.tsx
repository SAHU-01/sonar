/**
 * ResponseDetail: slide-out drawer showing full submission details,
 * Walrus blob link, on-chain tx, and raw data.
 */
'use client';

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
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-0 sm:inset-auto sm:right-0 sm:top-0 sm:h-full sm:w-full sm:max-w-lg bg-background sm:border-l border-border z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg">Response detail</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-lg">{'\u2715'}</button>
          </div>

          {/* Meta */}
          <div className="space-y-3 mb-8">
            <MetaRow label="Timestamp" value={submission.timestamp ? new Date(submission.timestamp).toLocaleString() : '-'} />
            <MetaRow label="Submitter" value={submission.submitter} mono />
            <MetaRow label="Walrus Blob" value={submission.blobId} mono link={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${submission.blobId}`} />
            {submission.txDigest && <MetaRow label="Sui Transaction" value={submission.txDigest} mono />}
          </div>

          {/* Field data */}
          <h3 className="font-semibold text-sm mb-4">Responses</h3>
          {submission.data ? (
            <div className="space-y-4">
              {fields.filter(f => !['section_header', 'description_block'].includes(f.type)).map((field) => {
                const value = submission.data?.[field.id];
                return (
                  <div key={field.id} className="bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">{field.label}</p>
                    <p className="text-sm">
                      {value === undefined || value === null || value === ''
                        ? <span className="text-muted-foreground italic">No response</span>
                        : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load response data</p>
          )}

          {/* Raw JSON */}
          <h3 className="font-semibold text-sm mt-8 mb-3">Raw JSON</h3>
          <pre className="bg-card border border-border rounded-xl p-4 text-xs font-mono text-muted-foreground overflow-x-auto max-h-60 overflow-y-auto">
            {JSON.stringify(submission.data, null, 2)}
          </pre>
        </div>
      </div>
    </>
  );
}

function MetaRow({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className={`text-sm text-accent hover:underline break-all ${mono ? 'font-mono' : ''}`}>
          {value}
        </a>
      ) : (
        <p className={`text-sm break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
      )}
    </div>
  );
}
