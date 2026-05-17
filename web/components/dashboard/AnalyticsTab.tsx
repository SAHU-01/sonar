/**
 * AnalyticsTab: recharts-powered analytics for form submissions.
 * Computes stats client-side from Walrus-fetched submission data.
 */
'use client';

import { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

interface SubmissionData {
  timestamp: string;
  data: Record<string, unknown> | null;
  submitter: string;
}

interface AnalyticsTabProps {
  submissions: SubmissionData[];
  fields: Array<{ id: string; type: string; label: string; options?: string[] }>;
}

const COLORS = ['#b08af0', '#e3ff73', '#ff8c42', '#22c55e', '#ef4444', '#6366f1', '#f59e0b', '#000000'];

export function AnalyticsTab({ submissions, fields }: AnalyticsTabProps) {
  const stats = useMemo(() => computeStats(submissions), [submissions]);
  const timeseriesData = useMemo(() => computeTimeseries(submissions), [submissions]);
  const fieldBreakdowns = useMemo(() => computeFieldBreakdowns(submissions, fields), [submissions, fields]);

  return (
    <div className="space-y-10 p-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="total submissions" value={String(stats.total)} />
        <StatCard label="today" value={String(stats.today)} />
        <StatCard label="this week" value={String(stats.thisWeek)} />
        <StatCard label="unique submitters" value={String(stats.uniqueSubmitters)} />
      </div>

      {/* Submissions over time */}
      <div className="neo-card bg-card p-8 shadow-brutal">
        <h3 className="text-2xl mb-8">submissions over time</h3>
        {timeseriesData.length > 1 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeseriesData}>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" opacity={0.1} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--foreground)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--foreground)' }} stroke="var(--border)" allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '2px solid var(--border-strong)', borderRadius: 12, fontSize: 12, fontWeight: 900, boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}
              />
              <Line type="stepAfter" dataKey="count" stroke="var(--accent)" strokeWidth={4} dot={{ r: 6, fill: 'var(--accent)', strokeWidth: 2, stroke: 'var(--border-strong)' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="p-20 text-center font-black opacity-20 lowercase">not enough data for chart</div>
        )}
      </div>

      {/* Field breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {fieldBreakdowns.map((fb) => (
          <div key={fb.fieldId} className="neo-card bg-card p-8 shadow-brutal">
            <h3 className="text-xl mb-6">{fb.label}</h3>
            {fb.type === 'bar' && fb.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={fb.data} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fontWeight: 900 }} stroke="var(--border)" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontWeight: 900 }} width={100} stroke="var(--border)" />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '2px solid var(--border-strong)', borderRadius: 12, fontSize: 12, fontWeight: 900, boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }} />
                  <Bar dataKey="count" fill="var(--cta)" stroke="var(--border-strong)" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            ) : fb.type === 'pie' && fb.data.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={fb.data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} stroke="var(--border-strong)" strokeWidth={2}>
                      {fb.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '2px solid var(--border-strong)', borderRadius: 12, fontSize: 12, fontWeight: 900, boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-1 gap-3">
                  {fb.data.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-border-strong shadow-brutal-sm rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs font-black lowercase opacity-60">{d.name}</span>
                      <span className="text-xs font-black">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : fb.type === 'rating' ? (
              <div className="space-y-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black">{fb.average?.toFixed(1)}</span>
                  <span className="text-xs font-black uppercase tracking-widest opacity-30">average rating</span>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={fb.data}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 900 }} stroke="var(--border)" />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '2px solid var(--border-strong)', borderRadius: 12, fontSize: 12, fontWeight: 900, boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }} />
                    <Bar dataKey="count" fill="var(--warning)" stroke="var(--border-strong)" strokeWidth={2} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-10 text-center font-black opacity-20 lowercase">no data available</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="neo-card bg-card p-6 shadow-brutal-sm hover:-translate-y-1 transition-transform">
      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">{label}</p>
      <p className="text-4xl font-black">{value}</p>
    </div>
  );
}

function computeStats(submissions: SubmissionData[]) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = subDays(todayStart, 7);

  const today = submissions.filter(s => s.timestamp && new Date(s.timestamp) >= todayStart).length;
  const thisWeek = submissions.filter(s => s.timestamp && new Date(s.timestamp) >= weekStart).length;
  const uniqueSubmitters = new Set(submissions.map(s => s.submitter)).size;

  return { total: submissions.length, today, thisWeek, uniqueSubmitters };
}

function computeTimeseries(submissions: SubmissionData[]) {
  const counts: Record<string, number> = {};
  for (const s of submissions) {
    if (!s.timestamp) continue;
    const day = format(new Date(s.timestamp), 'MMM dd');
    counts[day] = (counts[day] ?? 0) + 1;
  }
  return Object.entries(counts).map(([date, count]) => ({ date, count })).reverse();
}

interface BreakdownEntry { name: string; count: number }
interface FieldBreakdown { fieldId: string; label: string; type: 'bar' | 'pie' | 'rating'; data: BreakdownEntry[]; average?: number }

function computeFieldBreakdowns(submissions: SubmissionData[], fields: AnalyticsTabProps['fields']): FieldBreakdown[] {
  const result: FieldBreakdown[] = [];

  for (const field of fields) {
    if (['section_header', 'description_block', 'image_upload', 'video_upload', 'file_upload'].includes(field.type)) continue;

    const values = submissions.map(s => s.data?.[field.id]).filter(v => v !== undefined && v !== null && v !== '');

    if (values.length === 0) continue;

    if (field.type === 'star_rating' || field.type === 'number') {
      const nums = values.map(Number).filter(n => !isNaN(n));
      const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
      const counts: Record<string, number> = {};
      for (const n of nums) { counts[String(n)] = (counts[String(n)] ?? 0) + 1; }
      result.push({
        fieldId: field.id,
        label: field.label,
        type: 'rating',
        data: Object.entries(counts).sort(([a], [b]) => Number(a) - Number(b)).map(([name, count]) => ({ name, count })),
        average: avg,
      });
    } else if (['dropdown', 'radio'].includes(field.type)) {
      const counts: Record<string, number> = {};
      for (const v of values) { counts[String(v)] = (counts[String(v)] ?? 0) + 1; }
      result.push({
        fieldId: field.id,
        label: field.label,
        type: 'pie',
        data: Object.entries(counts).map(([name, count]) => ({ name, count })),
      });
    } else if (['checkboxes', 'multi_select'].includes(field.type)) {
      const counts: Record<string, number> = {};
      for (const v of values) {
        const arr = Array.isArray(v) ? v : [v];
        for (const item of arr) { counts[String(item)] = (counts[String(item)] ?? 0) + 1; }
      }
      result.push({
        fieldId: field.id,
        label: field.label,
        type: 'bar',
        data: Object.entries(counts).map(([name, count]) => ({ name, count })),
      });
    }
  }

  return result;
}
