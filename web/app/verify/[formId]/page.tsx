/**
 * Verification page. Shows on-chain data for a form: submission count,
 * event history, and lets users verify a submission hash against Walrus.
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { suiClient, PACKAGE_ID } from '@/lib/sui';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';

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
  const account = useCurrentAccount();

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
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, var(--gradient-start) 0%, var(--background) 100%)' }}>
      <nav className="px-4 sm:px-6 py-6 bg-card/30 border-b-4 border-border-strong mb-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl neo-btn-cta text-cta-foreground flex items-center justify-center font-black text-xl shadow-brutal-sm">s</div>
            <span className="font-black text-2xl tracking-tighter lowercase">sonar</span>
          </Link>
          <div className="flex items-center gap-4">
            {account && (
              <Link href="/dashboard" className="hidden sm:inline font-black lowercase hover:text-accent transition-colors text-sm">dashboard</Link>
            )}
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pb-20">
        <div className="mb-12">
          <h1 className="text-5xl mb-2">verification</h1>
          <p className="text-xl font-bold opacity-60 lowercase">{formTitle || 'loading form title...'}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <div className="neo-card bg-card p-8 shadow-brutal-sm">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">total submissions</p>
            <p className="text-5xl font-black">{events.length}</p>
          </div>
          <div className="neo-card bg-card p-8 shadow-brutal-sm">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">form object id</p>
            <code className="text-xs font-mono font-bold break-all opacity-70">{formId}</code>
          </div>
        </div>

        {/* Why this matters — info banner */}
        <div className="neo-card bg-info p-10 mb-12 border-border-strong shadow-brutal">
          <div className="flex gap-8 items-start">
            <div className="w-16 h-16 rounded-2xl bg-card border-2 border-border-strong flex items-center justify-center shrink-0 shadow-brutal-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <h3 className="text-2xl mb-4">why this matters</h3>
              <p className="text-lg font-bold text-info-foreground/70 leading-tight lowercase">
                every submission is stored as an immutable blob on walrus, with its blob id recorded
                on sui. this means no one — not even the form owner — can silently alter, delete, or fabricate submissions
                after the fact.
              </p>
            </div>
          </div>
        </div>

        {/* Event history */}
        <div className="neo-card bg-card p-8 sm:p-12 shadow-brutal-lg">
          <h2 className="text-3xl mb-8">on-chain event log</h2>
          {loading ? (
            <div className="p-20 text-center font-black opacity-20 lowercase">loading events from sui...</div>
          ) : events.length === 0 ? (
            <div className="p-20 text-center font-black opacity-20 lowercase">no submissions recorded yet.</div>
          ) : (
            <div className="space-y-6">
              {events.map((e, i) => (
                <div key={i} className="neo-card bg-card-cream p-6 shadow-brutal-sm border-dashed">
                  <div className="flex items-center justify-between mb-4">
                    <span className="neo-card bg-accent px-3 py-1 text-xs font-black shadow-none border-border-strong/20">#{events.length - i}</span>
                    <span className="text-xs font-black opacity-30 lowercase">{new Date(e.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="space-y-2 text-xs font-mono font-bold">
                    <div className="flex flex-col sm:flex-row sm:gap-2"><span className="opacity-40">blob_id: </span><span className="text-accent break-all">{e.blobId}</span></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><span className="opacity-40">submitter: </span><span className="break-all">{e.submitter}</span></div>
                    <div className="flex flex-col sm:flex-row sm:gap-2"><span className="opacity-40">tx_digest: </span><span className="break-all">{e.txDigest}</span></div>
                  </div>
                  <div className="mt-6">
                    <a
                      href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${e.blobId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="neo-btn-cta text-cta-foreground px-6 py-2.5 text-xs inline-block"
                    >
                      fetch from walrus &rarr;
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
