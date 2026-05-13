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
import { ResponseDetail } from '@/components/dashboard/ResponseDetail';
import Link from 'next/link';
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
    { id: 'responses' as const, label: 'Responses', count: submissions.length },
    { id: 'analytics' as const, label: 'Analytics' },
    { id: 'settings' as const, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/" className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-xs shrink-0">S</Link>
            <span className="text-muted-foreground hidden sm:inline">/</span>
            <span className="font-semibold truncate">{formSchema?.title ?? 'Dashboard'}</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-sm shrink-0">
            <Link href={`/f/${formId}`} className="text-muted-foreground hover:text-foreground hidden sm:inline">View form</Link>
            <Link href={`/verify/${formId}`} className="text-muted-foreground hover:text-foreground text-xs sm:text-sm">Verify</Link>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="border-b border-border px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto">
        {activeTab === 'responses' && (
          <div className="p-4 sm:p-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-4 gap-3 sm:gap-4">
              <div className="flex items-center gap-3 flex-1">
                <input
                  placeholder="Search submissions..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent w-full sm:max-w-xs"
                />
                {selectedRows.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{selectedRows.size} selected</span>
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
                        className="text-[10px] bg-card border border-border rounded px-2 py-1 hover:bg-muted transition-colors"
                      >
                        Mark {st}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={exportCSV} className="text-xs bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors">
                  Export CSV
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
                  className="text-xs bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                >
                  Export JSON
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-sm text-muted-foreground">Loading from Sui events...</div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  {searchQuery ? 'No submissions match your search' : 'No submissions yet'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left bg-muted/30">
                        <th className="px-4 py-2.5 w-8">
                          <input
                            type="checkbox"
                            checked={selectedRows.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                            onChange={e => {
                              if (e.target.checked) setSelectedRows(new Set(filteredSubmissions.map((_, i) => i)));
                              else setSelectedRows(new Set());
                            }}
                            className="accent-accent"
                          />
                        </th>
                        <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium">#</th>
                        <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium">Time</th>
                        <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium">Submitter</th>
                        <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium">Status</th>
                        {formSchema?.fields.slice(0, 3).filter(f => !['section_header', 'description_block'].includes(f.type)).map(f => (
                          <th key={f.id} className="px-4 py-2.5 text-xs text-muted-foreground font-medium">{f.label}</th>
                        ))}
                        <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium">Blob</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubmissions.map((s, i) => (
                        <tr
                          key={i}
                          onClick={() => setSelectedIdx(i)}
                          className={`border-b border-border/50 cursor-pointer transition-colors ${selectedIdx === i ? 'bg-accent/5' : 'hover:bg-muted/30'}`}
                        >
                          <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleRow(i); }}>
                            <input type="checkbox" checked={selectedRows.has(i)} onChange={() => toggleRow(i)} className="accent-accent" />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3 text-xs font-mono">{s.timestamp ? new Date(s.timestamp).toLocaleString() : '-'}</td>
                          <td className="px-4 py-3 text-xs font-mono">{s.submitter.slice(0, 6)}...{s.submitter.slice(-4)}</td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                const cycle: Record<string, SubmissionEntry['status']> = { new: 'reviewed', reviewed: 'resolved', resolved: 'new' };
                                setSubmissionStatus(s.blobId, cycle[s.status]);
                              }}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                                s.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' :
                                s.status === 'reviewed' ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' :
                                'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                            >{s.status}</button>
                          </td>
                          {formSchema?.fields.slice(0, 3).filter(f => !['section_header', 'description_block'].includes(f.type)).map(f => (
                            <td key={f.id} className="px-4 py-3 text-xs max-w-[150px] truncate">
                              {s.loading ? '...' : s.data?.[f.id] !== undefined ? String(s.data[f.id]) : '-'}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-xs font-mono text-accent">{s.blobId.slice(0, 12)}...</td>
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
          <div className="p-6 max-w-2xl">
            <h2 className="font-semibold mb-6">Form settings</h2>

            {formSchema && (
              <div className="space-y-6">
                <SettingRow label="Title" value={formSchema.title} />
                <SettingRow label="Version" value={String(formSchema.version)} />
                <SettingRow label="Encryption" value={formSchema.encryption?.enabled ? 'Enabled' : 'Disabled'} />
                <SettingRow label="Access control" value={formSchema.accessControl?.type ?? 'public'} />
                <SettingRow label="Submission limit" value={formSchema.submissionLimit ?? 'open'} />
                <SettingRow label="Success message" value={formSchema.successMessage ?? 'Thanks for your submission!'} />
                <SettingRow label="Form Object ID" value={formId ?? ''} mono />
                <SettingRow label="Package ID" value={PACKAGE_ID} mono />

                <div className="pt-6 border-t border-border">
                  <h3 className="font-semibold text-sm text-red-400 mb-3">Danger zone</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Forms on Sui cannot be deleted. You can archive a form to stop accepting new submissions.
                    Existing submissions on Walrus persist regardless.
                  </p>
                </div>
              </div>
            )}
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
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
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
