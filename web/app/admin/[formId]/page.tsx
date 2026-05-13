/**
 * Admin dashboard for a form. Fetches submissions via Sui events,
 * loads submission data from Walrus, displays in a table.
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { suiClient, PACKAGE_ID } from '@/lib/sui';
import { fetchBlobAsText } from '@/lib/walrus';
import Link from 'next/link';

interface SubmissionEntry {
  blobId: string;
  submitter: string;
  timestamp: string;
  data: Record<string, unknown> | null;
  loading: boolean;
}

export default function AdminPage() {
  const { formId } = useParams<{ formId: string }>();
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formTitle, setFormTitle] = useState('');

  useEffect(() => {
    if (!formId || !PACKAGE_ID) return;

    (async () => {
      try {
        // Load form title
        const obj = await suiClient.getObject({ id: formId, options: { showContent: true } });
        const content = obj.data?.content;
        if (content?.dataType === 'moveObject') {
          setFormTitle((content.fields as Record<string, string>).title ?? 'Form');
        }

        // Query Sui events
        const events = await suiClient.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::submission_batch::SubmissionRecorded` },
          order: 'descending',
        });

        const formEvents = events.data.filter((e) => {
          const p = e.parsedJson as Record<string, string>;
          return p.form_id === formId;
        });

        const entries: SubmissionEntry[] = formEvents.map((e) => {
          const p = e.parsedJson as Record<string, string>;
          return {
            blobId: p.blob_id,
            submitter: p.submitter,
            timestamp: e.timestampMs ? new Date(Number(e.timestampMs)).toISOString() : '',
            data: null,
            loading: true,
          };
        });

        setSubmissions(entries);
        setLoading(false);

        // Fetch submission data from Walrus in parallel
        for (let i = 0; i < entries.length; i++) {
          try {
            const text = await fetchBlobAsText(entries[i].blobId);
            const parsed = JSON.parse(text);
            setSubmissions((prev) => prev.map((s, j) =>
              j === i ? { ...s, data: parsed.data ?? parsed, loading: false } : s
            ));
          } catch {
            setSubmissions((prev) => prev.map((s, j) =>
              j === i ? { ...s, loading: false } : s
            ));
          }
        }
      } catch (err) {
        console.error('Failed to load submissions:', err);
        setLoading(false);
      }
    })();
  }, [formId]);

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-xs">S</Link>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="font-semibold">{formTitle || 'Dashboard'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href={`/f/${formId}`} className="text-muted-foreground hover:text-foreground transition-colors">
              View form
            </Link>
            <Link href={`/verify/${formId}`} className="text-muted-foreground hover:text-foreground transition-colors">
              Verify
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Total submissions" value={String(submissions.length)} />
          <StatCard label="Walrus blobs" value={String(submissions.filter(s => s.blobId).length)} />
          <StatCard label="On-chain events" value={String(submissions.length)} />
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Responses</h2>
            <button
              onClick={() => exportCSV(submissions)}
              className="text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Export CSV
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading submissions from Sui events...</div>
          ) : submissions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No submissions yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-2 text-xs text-muted-foreground font-medium">#</th>
                    <th className="px-5 py-2 text-xs text-muted-foreground font-medium">Timestamp</th>
                    <th className="px-5 py-2 text-xs text-muted-foreground font-medium">Submitter</th>
                    <th className="px-5 py-2 text-xs text-muted-foreground font-medium">Walrus Blob</th>
                    <th className="px-5 py-2 text-xs text-muted-foreground font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-5 py-3 font-mono text-xs">{s.timestamp ? new Date(s.timestamp).toLocaleString() : '-'}</td>
                      <td className="px-5 py-3 font-mono text-xs">{s.submitter.slice(0, 8)}...{s.submitter.slice(-6)}</td>
                      <td className="px-5 py-3 font-mono text-xs text-accent">{s.blobId.slice(0, 16)}...</td>
                      <td className="px-5 py-3 text-xs">
                        {s.loading ? (
                          <span className="text-muted-foreground">Loading...</span>
                        ) : s.data ? (
                          <pre className="max-w-xs truncate text-muted-foreground">{JSON.stringify(s.data)}</pre>
                        ) : (
                          <span className="text-red-400">Failed to load</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function exportCSV(submissions: SubmissionEntry[]) {
  const rows = submissions.map((s, i) => ({
    index: i + 1,
    timestamp: s.timestamp,
    submitter: s.submitter,
    blobId: s.blobId,
    data: s.data ? JSON.stringify(s.data) : '',
  }));

  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => JSON.stringify(String((r as Record<string, unknown>)[h] ?? ''))).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'submissions.csv';
  a.click();
  URL.revokeObjectURL(url);
}
