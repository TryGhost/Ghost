import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import type {
  AutomationDetail,
  AutomationEntryStats,
} from '@tryghost/admin-x-framework/api/automations';

// Production inherits this root sizing from Ember's patterns/global.css.
// This full-app test host does not load Ember's stylesheet.
let originalRootFontSize: string;
beforeAll(() => {
  originalRootFontSize = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '62.5%';
});
afterAll(() => {
  document.documentElement.style.fontSize = originalRootFontSize;
});

const flags = { labs: { automations: true, automationRunAnalytics: true } };
const detail = (id: string): AutomationDetail => ({
  id,
  name: 'Welcome series',
  slug: 'member-welcome-email-free',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  actions: [{ id: `${id}-wait`, type: 'wait', data: { wait_hours: 24 } }],
  edges: [],
});
const stats = (id: string, total = 1432, empty = false): AutomationEntryStats => ({
  automation_id: id,
  total_run_count: total,
  entries: Array.from({ length: 30 }, (_, day) => ({
    date: new Date(Date.UTC(2026, 5, 22 + day)).toISOString().slice(0, 10),
    count: empty
      ? 0
      : [
          18, 22, 24, 28, 26, 32, 36, 34, 40, 44, 42, 46, 48, 50, 48, 52, 54, 52, 50, 48, 44, 46,
          42, 40, 42, 38, 36, 38, 34, 36,
        ][day],
  })),
  window: { date_from: '2026-06-22', date_to: '2026-07-22', bucket: 'day', timezone: 'UTC' },
});
const response = (id: string, total = 1432, empty = false) => {
  const data = stats(id, total, empty);
  if (!empty) {
    const subtotal = data.entries.slice(0, -1).reduce((sum, entry) => sum + entry.count, 0);
    data.entries[data.entries.length - 1].count = total - subtotal;
  }
  return { automation_entry_stats: [data] };
};
const read = (id: string) => {
  return fakeAdminEndpoint('GET', `/automations/${id}/`, { automations: [detail(id)] });
};
const entries = () => page.getByRole('region', { name: 'Total entries' });
const open = () => page.getByRole('button', { name: 'Show performance' }).click();
const close = () => page.getByRole('button', { name: 'Hide performance' }).click();

describe('Automation total entries', () => {
  it('fetches on opening and shows the total and chart date labels', async () => {
    read('first');
    const request = fakeAdminEndpoint('GET', '/automations/first/entry-stats/', response('first'));
    await renderAdminApp('/automations/first', flags);
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    expect(request.requests).toHaveLength(0);
    await open();
    await expect.element(entries()).toHaveTextContent('1,432');
    await expect
      .element(entries().getByRole('figure', { name: 'Automation entries' }))
      .toBeVisible();
    await expect.element(entries()).toHaveTextContent('22 Jun');
    await expect.element(entries()).toHaveTextContent('21 Jul');
    await expect.poll(() => request.requests.length).toBe(1);
    const content = entries().element();
    await close();
    expect(content.isConnected).toBe(true);
    expect(content.closest('aside')?.inert).toBe(true);
    expect(content.closest('aside')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the plotted entry count in the chart tooltip', async () => {
    read('first');
    const body = response('first', 210);
    body.automation_entry_stats[0].entries.forEach((entry) => {
      entry.count = 7;
    });
    fakeAdminEndpoint('GET', '/automations/first/entry-stats/', body);
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(entries()).toHaveTextContent('210');
    await expect
      .poll(() => document.querySelector('aside')?.getBoundingClientRect().width)
      .toBe(480);
    await entries().getByRole('figure').hover();
    await expect.element(entries().getByText('Entries', { exact: true })).toBeVisible();
    await expect.element(entries().getByText('7', { exact: true })).toBeVisible();
  });

  it('shows loading while fetching and a genuine zero when the request succeeds', async () => {
    read('first');
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    fakeAdminEndpoint('GET', '/automations/first/entry-stats/', async () => {
      await pending;
      return response('first', 0, true);
    });
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(page.getByRole('status', { name: 'Loading total entries' })).toBeVisible();
    finish();
    await expect.element(entries()).toHaveTextContent('No entries yet');
    await expect.element(entries()).toHaveTextContent('0');
    await expect
      .element(page.getByRole('status', { name: 'Loading total entries' }))
      .not.toBeInTheDocument();
  });

  it('shows an inline error and retries the current automation', async () => {
    read('first');
    fakeAdminEndpoint(
      'GET',
      '/automations/first/entry-stats/',
      { errors: [{ message: 'Failed' }] },
      { status: 500 },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(entries().getByRole('alert')).toHaveTextContent('Could not load entries.');
    fakeAdminEndpoint('GET', '/automations/first/entry-stats/', response('first'));
    await entries().getByRole('button', { name: 'Retry' }).click();
    await expect.element(entries()).toHaveTextContent('1,432');
    await expect.element(entries().getByRole('alert')).not.toBeInTheDocument();
  });

  it('handles an older Core with no endpoint without displaying zero or a retry button', async () => {
    read('first');
    fakeAdminEndpoint(
      'GET',
      '/automations/first/entry-stats/',
      { errors: [{ message: 'Not found' }] },
      { status: 404 },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(entries())
      .toHaveTextContent('All-time entry analytics are unavailable on this version of Ghost.');
    await expect.element(entries().getByRole('figure')).not.toBeInTheDocument();
    await expect.element(entries().getByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it.each([
    { name: 'malformed', body: {} },
    { name: 'wrong automation', body: response('other') },
  ])('shows an error for a $name response', async ({ body }) => {
    read('first');
    fakeAdminEndpoint('GET', '/automations/first/entry-stats/', body);
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(entries().getByRole('alert')).toHaveTextContent('Could not load entries.');
    await expect.element(entries().getByRole('figure')).not.toBeInTheDocument();
  });

  it('caches the chart until the next page visit', async () => {
    read('first');
    const request = fakeAdminEndpoint('GET', '/automations/first/entry-stats/', response('first'));
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(entries()).toHaveTextContent('1,432');
    await close();
    await open();
    await expect.element(entries()).toHaveTextContent('1,432');
    await expect.element(entries()).not.toHaveTextContent('Updating');
    await expect
      .poll(() => document.querySelector('aside')?.getBoundingClientRect().width)
      .toBe(480);
    expect(request.requests).toHaveLength(1);
    read('second');
    window.location.hash = '#/automations/second';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    const revisit = fakeAdminEndpoint(
      'GET',
      '/automations/first/entry-stats/',
      response('first', 1500),
    );
    window.location.hash = '#/automations/first';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    expect(revisit.requests).toHaveLength(0);
    await open();
    await expect.element(entries()).toHaveTextContent('1,500');
    expect(revisit.requests).toHaveLength(1);
  });

  it('ignores a late response after switching automations and refreshes on return', async () => {
    read('first');
    read('second');
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const first = fakeAdminEndpoint('GET', '/automations/first/entry-stats/', async () => {
      await pending;
      return response('first');
    });
    fakeAdminEndpoint('GET', '/automations/second/entry-stats/', response('second', 2500));
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.poll(() => first.requests.length).toBe(1);
    window.location.hash = '#/automations/second';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await open();
    await expect.element(entries()).toHaveTextContent('2,500');
    finish();
    // Return navigation gives the late response a chance to populate only its own cache.
    const revisit = fakeAdminEndpoint(
      'GET',
      '/automations/first/entry-stats/',
      response('first', 1600),
    );
    await expect.element(entries()).not.toHaveTextContent('1,432');
    window.location.hash = '#/automations/first';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await open();
    await expect.element(entries()).toHaveTextContent('1,600');
    await expect.poll(() => revisit.requests.length).toBe(1);
  });

  it('does not fetch entry stats with the feature flag disabled', async () => {
    read('first');
    const request = fakeAdminEndpoint('GET', '/automations/first/entry-stats/', response('first'));
    await renderAdminApp('/automations/first', { labs: { automations: true } });
    await expect.element(page.getByRole('button', { name: 'Wait: 1 day' })).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Show performance' }))
      .not.toBeInTheDocument();
    expect(request.requests).toHaveLength(0);
  });
});
