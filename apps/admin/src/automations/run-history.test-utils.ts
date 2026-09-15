import { afterAll, beforeAll } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint } from '@test-utils/acceptance';
import type { AutomationDetail, AutomationRun } from '@tryghost/admin-x-framework/api/automations';
import type { AutomationRunHistory } from '@tryghost/admin-x-framework/api/automation-run-history';

let rootFontSize: string;
beforeAll(() => {
  rootFontSize = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '62.5%';
});
afterAll(() => {
  document.documentElement.style.fontSize = rootFontSize;
});

export const flags = { labs: { automations: true, automationRunAnalytics: true } };
export const timestamp = '2026-09-14T12:00:00.000Z';
export const run = (id: string, name = 'Alex'): AutomationRun => ({
  id,
  created_at: timestamp,
  status: 'completed',
  failed: false,
  member: { id: 'same-member', name, email: `${name.toLowerCase()}@example.com` },
});
export const history = (
  id: string,
  name = 'Alex',
  automationId = 'first',
): AutomationRunHistory => ({
  ...run(id, name),
  automation_id: automationId,
  history_status: 'available',
  steps: [
    {
      id: `${id}-step`,
      automation_action_revision_id: 'old-revision',
      status: 'finished',
      created_at: timestamp,
      updated_at: timestamp,
      ready_at: timestamp,
      started_at: timestamp,
      finished_at: timestamp,
      action: { id: 'removed-action', type: 'wait', data: { wait_hours: 72 } },
    },
  ],
});
export const detail = (id: string): AutomationDetail => ({
  id,
  name: 'Welcome series',
  slug: 'member-welcome-email-free',
  status: 'inactive',
  created_at: timestamp,
  updated_at: timestamp,
  actions: [{ id: 'draft-wait', type: 'wait', data: { wait_hours: 24 } }],
  edges: [],
});
export const setup = (id = 'first', runs = [run('a'), run('b', 'Bea')]) => {
  fakeAdminEndpoint('GET', `/automations/${id}/`, { automations: [detail(id)] });
  const list = fakeAdminEndpoint('GET', `/automations/${id}/runs/`, { automation_runs: runs });
  const counts = fakeAdminEndpoint('GET', `/automations/${id}/status-stats/`, {
    automation_status_stats: [
      {
        automation_id: id,
        in_progress_run_count: 1,
        completed_run_count: 1,
        exited_early_run_count: 0,
        unclassified_run_count: 0,
      },
    ],
  });
  fakeAdminEndpoint(
    'GET',
    new RegExp(`^/automations/${id}/entry-stats/\\?`),
    {
      errors: [{ message: 'Not available' }],
    },
    { status: 404 },
  );
  return { list, counts };
};
export const respond = (data: AutomationRunHistory) =>
  fakeAdminEndpoint('GET', `/automations/${data.automation_id}/runs/${data.id}/`, {
    automation_run_history: [data],
  });
export const canvas = () => page.getByRole('region', { name: 'Run history', exact: true });
export const editingCanvas = () => page.getByRole('region', { name: 'Editing canvas' });
export const select = (name = 'Alex') =>
  page.getByRole('button', { name: new RegExp(`View run history for ${name},`) }).click();
export const open = () => page.getByRole('button', { name: 'Show performance' }).click();
export const close = () => canvas().getByRole('button', { name: 'Back to editing' }).click();
