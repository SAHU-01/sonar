/**
 * Verification page. Shows on-chain data for a form: submission count,
 * event history, and lets users verify a submission hash against Walrus.
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { suiClient, PACKAGE_ID } from '@/lib/sui';
import Link from 'next/link';

interface EventEntry {
  blobId: string;
  submitter: string;
  timestamp: string;
  txDigest: string;
}

export default function VerifyPage() {
  const { formId } = useParams<{ formId: string }>();
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formTitle, setFormTitle] = useState('');

  useEffect(() => {
    if (!formId || !PACKAGE_ID) return;

    (async () => {
      try {
        const obj = await suiClient.getObject({ id: formId, options: { showContent: true } });
        const content = obj.data?.content;
        if (content?.dataType === 'moveObject') {
          setFormTitle((content.fields as Record<string, string>).title ?? 'Form');
        }

        const result = await suiClient.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::submission_batch::SubmissionRecorded` },
          order: 'descending',
        });

        const formEvents = result.data
          .filter((e) => (e.parsedJson as Record<string, string>).form_id === formId)
          .map((e) => {
            const p = e.parsedJson as Record<string, string>;
            return {
              blobId: p.blob_id,
              submitter: p.submitter,
              timestamp: e.timestampMs ? new Date(Number(e.timestampMs)).toISOString() : '',
              txDigest: e.id.txDigest,
            };
          });

        setEvents(formEvents);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [formId]);

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-xs">S</div>
            <span className="font-semibold">Sonar</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Verification</h1>
        <p className="text-muted-foreground mb-8">{formTitle}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Total submissions</p>
            <p className="text-3xl font-bold">{events.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Form Object ID</p>
            <code className="text-xs font-mono break-all">{formId}</code>
          </div>
        </div>

        {/* Why this matters */}
        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          <h3 className="font-semibold mb-2">Why this matters</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every submission to this form is stored as an immutable blob on Walrus, with its blob ID recorded
            on the Sui blockchain via a <code className="bg-muted px-1 rounded text-xs">SubmissionRecorded</code> event.
            This means no one — not even the form owner — can silently alter, delete, or fabricate submissions
            after the fact. You can independently verify any submission by fetching it from Walrus using the blob ID below.
          </p>
        </div>

        {/* Event history */}
        <h2 className="text-lg font-bold mb-4">On-chain event log</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading events from Sui...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((e, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">#{events.length - i}</span>
                  <span className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</span>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <div><span className="text-muted-foreground">blob_id: </span><span className="text-accent">{e.blobId}</span></div>
                  <div><span className="text-muted-foreground">submitter: </span>{e.submitter}</div>
                  <div><span className="text-muted-foreground">tx: </span>{e.txDigest}</div>
                </div>
                <div className="mt-2">
                  <a
                    href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${e.blobId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    Fetch from Walrus {'\u2192'}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
