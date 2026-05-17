/**
 * Admin dashboard: three tabs — Responses, Analytics, Settings.
 * Reads all data from Sui events + Walrus blobs. No database.
 */
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { suiClient, PACKAGE_ID } from '@/lib/sui';
import { fetchBlobAsText } from '@/lib/walrus';
import { AnalyticsTab } from '@/components/dashboard/AnalyticsTab';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ResponseDetail } from '@/components/dashboard/ResponseDetail';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import Link from 'next/link';
import { toast } from 'sonner';
import type { FormSchemaType } from '@sonar/shared/schema';

interface SubmissionEntry {
  blobId: string;
  submitter: string;
  timestamp: string;
  txDigest: string;
  data: Record<string, unknown> | null;
  loading: boolean;
  status: 'new' | 'reviewed' | 'resolved';
}

export default function AdminPage() {
  const { formId } = useParams<{ formId: string }>();
  const account = useCurrentAccount();
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formSchema, setFormSchema] = useState<FormSchemaType | null>(null);
  const [activeTab, setActiveTab] = useState<'responses' | 'analytics' | 'settings'>('responses');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Load saved statuses from localStorage
  const statusKey = `sonar:status:${formId}`;
  function loadSavedStatuses(): Record<string, SubmissionEntry['status']> {
    try {
      return JSON.parse(localStorage.getItem(statusKey) ?? '{}');
    } catch { return {}; }
  }
  function saveStatuses(submissions: SubmissionEntry[]) {
    const map: Record<string, string> = {};
    for (const s of submissions) {
      if (s.status !== 'new') map[s.blobId] = s.status;
    }
    localStorage.setItem(statusKey, JSON.stringify(map));
  }

  const setSubmissionStatus = (blobId: string, status: SubmissionEntry['status']) => {
    setSubmissions(prev => {
      const next = prev.map(s => s.blobId === blobId ? { ...s, status } : s);
      saveStatuses(next);
      return next;
    });
  };

  useEffect(() => {
    if (!formId || !PACKAGE_ID) return;
    loadDashboard(formId).then(({ schema, entries }) => {
      // Restore persisted statuses
      const saved = loadSavedStatuses();
      const restored = entries.map(e => ({ ...e, status: (saved[e.blobId] as SubmissionEntry['status']) ?? 'new' }));
      setFormSchema(schema);
      setSubmissions(restored);
      setLoading(false);
      // Fetch submission data from Walrus
      restored.forEach((entry, i) => {
        fetchBlobAsText(entry.blobId)
          .then(text => {
            const parsed = JSON.parse(text);
            setSubmissions(prev => prev.map((s, j) =>
              j === i ? { ...s, data: parsed.data ?? parsed, loading: false } : s
            ));
          })
          .catch(() => {
            setSubmissions(prev => prev.map((s, j) =>
              j === i ? { ...s, loading: false } : s
            ));
          });
      });
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const filteredSubmissions = useMemo(() => {
    if (!searchQuery) return submissions;
    const q = searchQuery.toLowerCase();
    return submissions.filter(s => {
      if (s.submitter.toLowerCase().includes(q)) return true;
      if (s.blobId.toLowerCase().includes(q)) return true;
      if (s.data && JSON.stringify(s.data).toLowerCase().includes(q)) return true;
      return false;
    });
  }, [submissions, searchQuery]);

  const toggleRow = (idx: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const exportCSV = () => {
    const rows = filteredSubmissions.map((s, i) => ({
      '#': i + 1,
      timestamp: s.timestamp ? new Date(s.timestamp).toISOString() : '',
      submitter: s.submitter,
      blobId: s.blobId,
      status: s.status,
      ...Object.fromEntries(
        formSchema?.fields
          .filter(f => !['section_header', 'description_block'].includes(f.type))
          .map(f => [f.label, s.data?.[f.id] ?? '']) ?? []
      ),
    }));

    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => JSON.stringify(String((r as Record<string, unknown>)[h] ?? ''))).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sonar-${formId?.slice(0, 8)}-submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'responses' as const, label: 'responses', count: submissions.length },
    { id: 'analytics' as const, label: 'analytics' },
    { id: 'settings' as const, label: 'settings' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, var(--gradient-start) 0%, var(--background) 100%)' }}>
      {/* Nav */}
      <nav className="px-4 sm:px-6 py-6 bg-card/30 border-b-4 border-border-strong mb-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-6 gap-x-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/dashboard" className="w-10 h-10 rounded-xl neo-btn bg-accent text-white flex items-center justify-center font-black text-xl shadow-brutal-sm shrink-0" title="Back to Dashboard">&larr;</Link>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black uppercase tracking-widest opacity-40">analytics</span>
              <h1 className="text-xl truncate lowercase">{formSchema?.title ?? 'loading...'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm shrink-0 ml-auto sm:ml-0">
            {account && (
              <Link href="/dashboard" className="hidden sm:inline font-black lowercase hover:text-accent transition-colors">dashboard</Link>
            )}
            <Link href={`/f/${formId}`} className="hidden sm:inline font-black lowercase hover:text-accent transition-colors">view form</Link>
            <Link href={`/verify/${formId}`} className="hidden sm:inline font-black lowercase hover:text-accent transition-colors">verify</Link>
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pb-20">
        {/* Tabs */}
        <div className="flex gap-4 mb-10 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-3 text-base whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'neo-btn-cta text-cta-foreground' : 'neo-btn bg-card opacity-60 hover:opacity-100'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && <span className={`ml-3 text-xs px-2 py-0.5 rounded-lg ${activeTab === tab.id ? 'bg-black/10' : 'bg-foreground/10'}`}>{tab.count}</span>}
            </button>
          ))}
        </div>

        {activeTab === 'responses' && (
          <div className="space-y-8">
            {/* Toolbar */}
            <div className="neo-card bg-card p-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6">
              <div className="flex flex-1 items-center gap-4">
                <input
                  placeholder="search submissions..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="neo-input flex-1 sm:max-w-md font-bold"
                />
                {selectedRows.size > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-widest opacity-40 whitespace-nowrap">{selectedRows.size} selected</span>
                    <div className="flex gap-2">
                      {(['reviewed', 'resolved', 'new'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => {
                            selectedRows.forEach(idx => {
                              const s = filteredSubmissions[idx];
                              if (s) setSubmissionStatus(s.blobId, st);
                            });
                            setSelectedRows(new Set());
                          }}
                          className="neo-btn bg-card px-4 py-1.5 text-xs shadow-brutal-sm hover:bg-muted"
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={exportCSV} className="neo-btn-cta text-cta-foreground px-6 py-2.5 text-sm">
                  export csv &rarr;
                </button>
                <button
                  onClick={() => {
                    const json = JSON.stringify(filteredSubmissions.map(s => s.data), null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'submissions.json'; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="neo-btn bg-accent px-6 py-2.5 text-sm"
                >
                  export json
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="neo-card bg-card overflow-hidden">
              {loading ? (
                <div className="p-20 text-center font-black opacity-30 lowercase">loading from sui events...</div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="p-20 text-center font-black opacity-30 lowercase">
                  {searchQuery ? 'no submissions match your search' : 'no submissions yet'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b-4 border-border-strong bg-muted/20">
                        <th className="px-6 py-4 w-12">
                          <input
                            type="checkbox"
                            checked={selectedRows.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                            onChange={e => {
                              if (e.target.checked) setSelectedRows(new Set(filteredSubmissions.map((_, i) => i)));
                              else setSelectedRows(new Set());
                            }}
                            className="w-5 h-5 accent-cta border-2 border-border-strong rounded shadow-brutal-sm"
                          />
                        </th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest opacity-50">#</th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest opacity-50">time</th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest opacity-50">submitter</th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest opacity-50">status</th>
                        {formSchema?.fields.slice(0, 3).filter(f => !['section_header', 'description_block'].includes(f.type)).map(f => (
                          <th key={f.id} className="px-6 py-4 text-xs font-black uppercase tracking-widest opacity-50">{f.label}</th>
                        ))}
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest opacity-50">blob</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-border-strong/10">
                      {filteredSubmissions.map((s, i) => (
                        <tr
                          key={i}
                          onClick={() => setSelectedIdx(i)}
                          className={`cursor-pointer transition-colors group ${selectedIdx === i ? 'bg-accent/10' : 'hover:bg-muted/30'}`}
                        >
                          <td className="px-6 py-5" onClick={e => { e.stopPropagation(); toggleRow(i); }}>
                            <input type="checkbox" checked={selectedRows.has(i)} onChange={() => toggleRow(i)} className="w-5 h-5 accent-cta" />
                          </td>
                          <td className="px-6 py-5 font-black opacity-30">{i + 1}</td>
                          <td className="px-6 py-5 text-sm font-bold opacity-70">{s.timestamp ? new Date(s.timestamp).toLocaleString() : '-'}</td>
                          <td className="px-6 py-5 text-sm font-mono font-bold opacity-70">{s.submitter.slice(0, 6)}...{s.submitter.slice(-4)}</td>
                          <td className="px-6 py-5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                const cycle: Record<string, SubmissionEntry['status']> = { new: 'reviewed', reviewed: 'resolved', resolved: 'new' };
                                setSubmissionStatus(s.blobId, cycle[s.status]);
                              }}
                              className={`neo-btn px-4 py-1 text-[10px] shadow-brutal-sm ${
                                s.status === 'resolved' ? 'bg-success' :
                                s.status === 'reviewed' ? 'bg-accent' :
                                'bg-card'
                              }`}
                            >{s.status}</button>
                          </td>
                          {formSchema?.fields.slice(0, 3).filter(f => !['section_header', 'description_block'].includes(f.type)).map(f => (
                            <td key={f.id} className="px-6 py-5 text-sm font-bold max-w-[200px] truncate">
                              {s.loading ? '...' : s.data?.[f.id] !== undefined ? String(s.data[f.id]) : '-'}
                            </td>
                          ))}
                          <td className="px-6 py-5 text-sm font-mono font-bold text-accent">{s.blobId.slice(0, 12)}...</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && formSchema && (
          <AnalyticsTab
            submissions={submissions.filter(s => !s.loading).map(s => ({
              timestamp: s.timestamp,
              data: s.data,
              submitter: s.submitter,
            }))}
            fields={formSchema.fields}
          />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-10 max-w-3xl">
            <div className="neo-card bg-card p-10">
              <h2 className="text-4xl mb-8">form settings</h2>
              {formSchema && (
                <div className="space-y-8">
                  <SettingRow label="title" value={formSchema.title} />
                  <SettingRow label="version" value={String(formSchema.version)} />
                  <SettingRow label="encryption" value={formSchema.encryption?.enabled ? 'enabled' : 'disabled'} />
                  <SettingRow label="access control" value={formSchema.accessControl?.type ?? 'public'} />
                  <SettingRow label="submission limit" value={formSchema.submissionLimit ?? 'open'} />
                  <SettingRow label="success message" value={formSchema.successMessage ?? 'thanks for your submission!'} />
                  <SettingRow label="form object id" value={formId ?? ''} mono />
                  <SettingRow label="package id" value={PACKAGE_ID} mono />
                </div>
              )}
            </div>

            <div className="neo-card bg-card p-10">
              <h2 className="text-3xl mb-8">storage usage</h2>
              <StorageUsage submissionCount={submissions.length} />
            </div>

            <div className="neo-card bg-card p-10">
              <h2 className="text-3xl mb-8">quick links</h2>
              <div className="grid gap-6">
                <SettingLink label="respondent url" href={`/f/${formId}`} />
                <SettingLink label="embed url" href={`/f/${formId}?embed=true`} />
                <SettingLink label="verification page" href={`/verify/${formId}`} />
                <SettingLink label="edit form" href={`/edit/${formId}`} />
              </div>
            </div>

            <div className="neo-card bg-info p-10 border-border-strong shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-3xl text-info-foreground mb-4">danger zone</h2>
              <p className="font-bold text-info-foreground/70 leading-tight mb-8 lowercase">
                forms on sui cannot be deleted — they are shared objects. existing submissions on walrus persist regardless.
                archiving stops the form from accepting new responses.
              </p>
              <button className="neo-btn bg-destructive px-8 py-3 text-white">archive form</button>
            </div>
          </div>
        )}
      </main>

      {/* Detail drawer */}
      {selectedIdx !== null && formSchema && (
        <ResponseDetail
          submission={filteredSubmissions[selectedIdx] ? {
            ...filteredSubmissions[selectedIdx],
          } : null}
          fields={formSchema.fields}
          onClose={() => setSelectedIdx(null)}
        />
      )}
    </div>
  );
}

function SettingRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-border-strong/5 pb-6 last:border-0 last:pb-0">
      <span className="text-xs font-black uppercase tracking-widest opacity-40 shrink-0">{label}</span>
      <span className={`font-bold sm:text-right break-all ${mono ? 'font-mono text-xs text-accent' : 'text-lg lowercase'}`}>{value}</span>
    </div>
  );
}

function SettingLink({ label, href }: { label: string; href: string }) {
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${href}` : href;
  return (
    <div className="flex flex-col border-b-2 border-border-strong/5 pb-8 last:border-0 last:pb-0 w-full overflow-hidden">
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">{label}</span>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
        <div className="min-w-0 flex-1">
          <code className="neo-card bg-card-cream px-4 py-3 text-[10px] font-mono font-bold opacity-70 truncate block shadow-none border-dashed border-2">
            {href}
          </code>
        </div>
        <button
          onClick={() => { 
            navigator.clipboard.writeText(fullUrl); 
            toast.success('link copied!');
          }}
          className="neo-btn bg-cta text-cta-foreground px-8 py-3 text-xs font-black shadow-brutal-sm whitespace-nowrap shrink-0"
        >
          copy link
        </button>
      </div>
    </div>
  );
}

const FREE_TIER_MB = 100;

function StorageUsage({ submissionCount }: { submissionCount: number }) {
  const estimatedKB = submissionCount * 3;
  const estimatedMB = estimatedKB / 1024;
  const percent = Math.min((estimatedMB / FREE_TIER_MB) * 100, 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest opacity-40">estimated usage</span>
        <span className="font-black text-2xl">
          {estimatedMB < 1 ? `${estimatedKB.toFixed(0)}kb` : `${estimatedMB.toFixed(1)}mb`} <span className="text-sm opacity-20">/ {FREE_TIER_MB}mb</span>
        </span>
      </div>
      <div className="w-full neo-card bg-muted border-border-strong h-10 overflow-hidden shadow-brutal-sm">
        <div
          className={`h-full border-r-4 border-border-strong transition-all ${percent > 80 ? 'bg-warning' : percent > 95 ? 'bg-destructive' : 'bg-accent'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs font-black opacity-40 uppercase tracking-widest">
        <span>free tier: {FREE_TIER_MB}mb per form</span>
        <span>{submissionCount} submissions recorded</span>
      </div>
      {percent > 80 && (
        <div className="neo-card bg-warning p-4 border-border-strong text-xs font-bold">
          approaching free tier limit. file uploads consume more storage.
        </div>
      )}
    </div>
  );
}

async function loadDashboard(formId: string) {
  const obj = await suiClient.getObject({ id: formId, options: { showContent: true } });
  const content = obj.data?.content;
  let schema: FormSchemaType | null = null;

  if (content?.dataType === 'moveObject') {
    const fields = content.fields as Record<string, string>;
    const blobId = fields.current_blob_id;
    if (blobId) {
      const text = await fetchBlobAsText(blobId);
      schema = JSON.parse(text);
    }
  }

  const events = await suiClient.queryEvents({
    query: { MoveEventType: `${PACKAGE_ID}::submission_batch::SubmissionRecorded` },
    order: 'descending',
  });

  const entries: SubmissionEntry[] = events.data
    .filter(e => (e.parsedJson as Record<string, string>).form_id === formId)
    .map(e => {
      const p = e.parsedJson as Record<string, string>;
      return {
        blobId: p.blob_id,
        submitter: p.submitter,
        timestamp: e.timestampMs ? new Date(Number(e.timestampMs)).toISOString() : '',
        txDigest: e.id.txDigest,
        data: null,
        loading: true,
        status: 'new' as const,
      };
    });

  return { schema, entries };
}
