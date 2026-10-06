import { expect } from 'vitest';
import { automationsScreen } from './automations.screen';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, settleTransitions } from '@test-utils/acceptance';
import type {
  AutomationDetail,
  AutomationPerformanceStats,
  AutomationRun,
} from '@tryghost/admin-x-framework/api/automations';

export const flags = {
  labs: { automations: true, automationRunAnalytics: true, automationsTinybirdSync: true },
};
const detail = (id: string): AutomationDetail => ({
  id,
  name: 'Welcome series',
  description: '',
  slug: 'member-welcome-email-free',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  actions: [{ id: `${id}-wait`, type: 'wait', data: { wait_hours: 24 } }],
  edges: [],
});
// Counts and daily entries describe the same runs; every default response is valid.
export const response = (
  id: string,
  counts = { inProgress: 118, completed: 1260, exitedEarly: 54 },
) => {
  const total = counts.inProgress + counts.completed + counts.exitedEarly;
  const data: AutomationPerformanceStats = {
    automation_id: id,
    total_run_count: total,
    in_progress_run_count: counts.inProgress,
    completed_run_count: counts.completed,
    exited_early_run_count: counts.exitedEarly,
    entries: [
      { date: '2026-06-22', count: Math.floor(total / 2) },
      { date: '2026-06-23', count: Math.ceil(total / 2) },
    ],
    entry_window: {
      date_from: '2026-06-22',
      date_to: '2026-06-24',
      bucket: 'day',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };
  return { automation_performance_stats: [data] };
};
export const read = (id: string) =>
  fakeAdminEndpoint('GET', `/automations/${id}/`, { automations: [detail(id)] });
export const prepareStatuses = (id = 'first') => {
  read(id);
  return fakeAdminEndpoint(
    'GET',
    new RegExp(`/automations/${id}/performance-stats/\\?`),
    ({ url }) => {
      const body = response(id);
      const stats = body.automation_performance_stats[0];
      const params = new URL(url).searchParams;
      const start = params.get('date_from');
      const end = params.get('date_to');
      if (start && end) {
        // Requests use inclusive calendar dates; response windows end exclusively.
        const dayMs = 86400000;
        const days = (Date.parse(end) - Date.parse(start)) / dayMs + 1;
        stats.entry_window.date_from = start;
        stats.entry_window.date_to = new Date(Date.parse(end) + dayMs).toISOString().slice(0, 10);
        stats.entries = Array.from({ length: days }, (_, day) => ({
          date: new Date(Date.parse(start) + day * dayMs).toISOString().slice(0, 10),
          count: day === days - 1 ? stats.total_run_count : 0,
        }));
      }
      return body;
    },
  );
};

export const run = (overrides: Partial<AutomationRun> = {}): AutomationRun => ({
  id: 'run',
  created_at: '2026-09-14T12:00:00.000Z',
  status: 'completed',
  failed: false,
  member: { id: 'member', name: 'Noah Bennett', email: 'noah@example.com' },
  ...overrides,
});

export const runsScroller = () => page.getByTestId('automation-runs-scroll').element();

export const scrollRunsToEnd = () => {
  const scroller = runsScroller();
  scroller.scrollTop = scroller.scrollHeight;
  scroller.dispatchEvent(new Event('scroll'));
};

/** Opens the moving panel and waits until its controls can be clicked. */
export async function openPerformanceSidebar(): Promise<void> {
  await settleTransitions();
  await automationsScreen.showPerformanceButton().click();
  await expect.element(automationsScreen.performanceHeading()).toBeVisible();
  await settleTransitions();
}
