/**
 * Analytics computation utilities. Queries analytics_events and submissions
 * tables to produce dashboard metrics. Used by the /api/analytics/[formId] route.
 */

export interface FormAnalytics {
  totalSubmissions: number;
  submissionsToday: number;
  completionRate: number;
  avgTimeToComplete: number; // seconds
  submissionsOverTime: Array<{ date: string; count: number }>;
  fieldBreakdowns: Record<string, unknown>;
  dropOffFunnel: Array<{ fieldId: string; label: string; views: number; completions: number }>;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
}

// TODO: implement analytics queries after DB is connected
export async function computeFormAnalytics(_formId: string): Promise<FormAnalytics> {
  return {
    totalSubmissions: 0,
    submissionsToday: 0,
    completionRate: 0,
    avgTimeToComplete: 0,
    submissionsOverTime: [],
    fieldBreakdowns: {},
    dropOffFunnel: [],
    deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
  };
}
