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

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#4f46e5', '#7c3aed', '#6d28d9'];

export function AnalyticsTab({ submissions, fields }: AnalyticsTabProps) {
  const stats = useMemo(() => computeStats(submissions), [submissions]);
  const timeseriesData = useMemo(() => computeTimeseries(submissions), [submissions]);
  const fieldBreakdowns = useMemo(() => computeFieldBreakdowns(submissions, fields), [submissions, fields]);

  return (
    <div className="space-y-8 p-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total submissions" value={String(stats.total)} />
        <StatCard label="Today" value={String(stats.today)} />
        <StatCard label="This week" value={String(stats.thisWeek)} />
        <StatCard label="Unique submitters" value={String(stats.uniqueSubmitters)} />
      </div>

      {/* Submissions over time */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-4">Submissions over time</h3>
        {timeseriesData.length > 1 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timeseriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
              <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Not enough data for chart</p>
        )}
      </div>

      {/* Field breakdowns */}
      {fieldBreakdowns.map((fb) => (
        <div key={fb.fieldId} className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">{fb.label}</h3>
          {fb.type === 'bar' && fb.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fb.data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#a1a1aa' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#a1a1aa' }} width={120} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : fb.type === 'pie' && fb.data.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={fb.data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={0}>
                    {fb.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 text-xs">
                {fb.data.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-medium">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : fb.type === 'rating' ? (
            <div className="space-y-2">
              <p className="text-2xl font-bold">{fb.average?.toFixed(1)} <span className="text-sm text-muted-foreground font-normal">average</span></p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={fb.data}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </div>
      ))}
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
