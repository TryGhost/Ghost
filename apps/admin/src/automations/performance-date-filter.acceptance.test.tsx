import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { run } from './run-list.test-utils';
import { QueryCache } from '@tanstack/react-query';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import type { AutomationPerformanceStats } from '@tryghost/admin-x-framework/api/automations';

const flags = {
  labs: { automations: true, automationRunAnalytics: true, automationsTinybirdSync: true },
};
const endpoint = /\/automations\/dates\/performance-stats\/\?/;
const timezone = 'America/New_York';
const presets = [
  { days: 7, start: '2024-03-04', counts: [1, 2, 3] },
  { days: 30, start: '2024-02-10', counts: [4, 5, 6] },
  { days: 90, start: '2023-12-12', counts: [7, 8, 9] },
] as const;
const entries = () => page.getByRole('region', { name: 'Total entries' });
const card = (name: string) => page.getByRole('button', { name, exact: true });
const labels = ['In progress', 'Completed', 'Exited early'] as const;

// Freeze only Date so network, polling, and UI timers still run normally.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2024-03-11T02:00:00Z'));
  const options = Intl.DateTimeFormat().resolvedOptions();
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    ...options,
    timeZone: timezone,
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const response = (start: string, counts: readonly [number, number, number]) => {
  const end = '2024-03-11';
  const total = counts.reduce((sum, count) => sum + count, 0);
  const days = (Date.parse(end) - Date.parse(start)) / 86400000;
  const stats: AutomationPerformanceStats = {
    automation_id: 'dates',
    total_run_count: total,
    in_progress_run_count: counts[0],
    completed_run_count: counts[1],
    exited_early_run_count: counts[2],
    entries: Array.from({ length: days }, (_, day) => ({
      date: new Date(Date.parse(start) + day * 86400000).toISOString().slice(0, 10),
      count: day === days - 1 ? total : 0,
    })),
    entry_window: { date_from: start, date_to: end, timezone, bucket: 'day' },
  };
  return { automation_performance_stats: [stats] };
};
const allTime = () => response('2023-12-01', [10, 20, 30]);
const render = async (withRuns = false) => {
  if (!withRuns) {
    fakeAdminEndpoint('GET', /\/automations\/dates\/runs\/\?/, { automation_runs: [] });
  }
  fakeAdminEndpoint('GET', '/automations/dates/', {
    automations: [
      {
        id: 'dates',
        name: 'Welcome',
        slug: 'member-welcome-email-free',
        status: 'active',
        actions: [{ id: 'wait', type: 'wait', data: { wait_hours: 24 } }],
        edges: [],
      },
    ],
  });
  await renderAdminApp('/automations/dates', flags);
  await page.getByRole('button', { name: 'Show performance' }).click();
};
const selectRange = async (label: string) => {
  await page.getByRole('button', { name: 'Filter performance' }).click();
  await page.getByRole('menuitemradio', { name: label }).click();
};
const expectCounts = async (counts: readonly [number, number, number]) => {
  const total = counts.reduce((sum, count) => sum + count, 0);
  await expect
    .element(entries().getByRole('status'))
    .toHaveTextContent(`Total entries loaded: ${total}.`);
  await expect.element(entries().getByRole('figure')).toBeVisible();
  for (const [index, label] of labels.entries()) {
    await expect.element(card(label)).toHaveTextContent(String(counts[index]));
  }
};
const params = (url: string) => Object.fromEntries(new URL(url).searchParams);

describe('Automation performance date filter', () => {
  it('renders first-day all-time history with distinct hour labels and shared totals', async () => {
    const body = response('2024-03-10', [1, 2, 3]);
    const stats = body.automation_performance_stats[0];
    stats.entry_window.bucket = 'hour';
    stats.entries = [
      { date: '2024-03-10T05:00:00Z', count: 0 },
      { date: '2024-03-10T06:00:00Z', count: 6 },
    ];
    const requests = fakeAdminEndpoint('GET', endpoint, body);
    await render();
    await expectCounts([1, 2, 3]);
    const ticks = () =>
      entries().element().querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick text');
    await expect.poll(() => ticks().length).toBe(2);
    const text = [...ticks()].map((tick) => tick.textContent);
    expect(text[0]).toMatch(/\d+:\d+[ap]m/);
    expect(text[1]).toMatch(/\d+:\d+[ap]m/);
    expect(text[0]).not.toBe(text[1]);
    expect(requests.requests).toHaveLength(1);
    expect(params(requests.requests[0].url)).toEqual({ timezone });
  });

  it('requests explicit local dates once per preset and updates the chart and all status cards', async () => {
    const requests = fakeAdminEndpoint('GET', endpoint, ({ url }) => {
      const preset = presets.find(({ start }) => start === params(url).date_from);
      return preset ? response(preset.start, preset.counts) : allTime();
    });
    await render();
    await expectCounts([10, 20, 30]);
    expect(params(requests.requests[0].url)).toEqual({ timezone });
    for (const { days, start, counts } of presets) {
      await selectRange(`Last ${days} days`);
      await expectCounts(counts);
      expect(params(requests.requests.at(-1)!.url)).toEqual({
        date_from: start,
        date_to: '2024-03-10',
        timezone,
      });
    }
    expect(requests.requests).toHaveLength(4);
  });

  it('keeps run dates and status filters together, including clearing either filter', async () => {
    fakeAdminEndpoint('GET', endpoint, ({ url }) =>
      params(url).date_from ? response('2024-03-04', [1, 2, 3]) : allTime(),
    );
    const requests = fakeAdminEndpoint('GET', /\/automations\/dates\/runs\/\?/, ({ url }) => {
      const selected = params(url);
      const name = `${selected.date_from ?? 'all'} ${selected.status ?? 'any'}`;
      return {
        automation_runs: [
          run({
            created_at: '2024-03-10T12:00:00.000Z',
            member: { id: 'member', name, email: 'member@example.com' },
          }),
        ],
      };
    });
    await render(true);
    const runs = () => page.getByRole('region', { name: 'Automation runs', exact: true });
    await expect.element(runs()).toHaveTextContent('all any');
    await selectRange('Last 7 days');
    await expect.element(runs()).toHaveTextContent('2024-03-04 any');
    await card('Completed').click();
    await expect.element(runs()).toHaveTextContent('2024-03-04 completed');
    expect(params(requests.requests.at(-1)!.url)).toEqual({
      date_from: '2024-03-04',
      date_to: '2024-03-10',
      timezone,
      status: 'completed',
    });
    await page.getByRole('button', { name: 'Clear date filter' }).click();
    await expect.element(runs()).toHaveTextContent('all completed');
    expect(params(requests.requests.at(-1)!.url)).toEqual({ timezone, status: 'completed' });
    await card('Completed').click();
    await expect.element(runs()).toHaveTextContent('all any');
    expect(params(requests.requests.at(-1)!.url)).toEqual({ timezone });
    expect(requests.requests).toHaveLength(5);
  });

  it('clears the previous rows and loads the whole panel when the date range changes', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    fakeAdminEndpoint('GET', endpoint, async ({ url }) => {
      if (!params(url).date_from) {
        return allTime();
      }
      await pending;
      return response('2024-03-04', [0, 0, 0]);
    });
    fakeAdminEndpoint('GET', /\/automations\/dates\/runs\/\?/, async ({ url }) => {
      if (params(url).date_from) {
        await pending;
        return { automation_runs: [] };
      }
      return { automation_runs: [run({ created_at: '2024-03-10T12:00:00.000Z' })] };
    });
    await render(true);
    const runs = () => page.getByRole('region', { name: 'Automation runs', exact: true });
    await expectCounts([10, 20, 30]);
    await expect.element(runs()).toHaveTextContent('Noah Bennett');
    try {
      await selectRange('Last 7 days');
      await expect
        .element(entries().getByRole('status'))
        .toHaveTextContent('Loading total entries');
      await expect.element(runs().getByRole('status')).toHaveTextContent('Loading automation runs');
      await expect.element(runs()).not.toHaveTextContent('Noah Bennett');
      for (const label of labels) {
        await expect.element(card(label)).toHaveAccessibleDescription('Loading');
      }
    } finally {
      finish();
    }
    await expectCounts([0, 0, 0]);
    await expect.element(runs().getByRole('status')).toHaveTextContent('No entries in this period');
  });

  it('retains the selected period on reopening and clears back to all time', async () => {
    const requests = fakeAdminEndpoint('GET', endpoint, ({ url }) =>
      params(url).date_from ? response('2024-03-04', [1, 2, 3]) : allTime(),
    );
    await render();
    await expectCounts([10, 20, 30]);
    await selectRange('Last 7 days');
    await expectCounts([1, 2, 3]);
    await page.getByRole('button', { name: 'Hide performance' }).click();
    await page.getByRole('button', { name: 'Show performance' }).click();
    await expect
      .element(page.getByRole('button', { name: 'Clear date filter' }))
      .toHaveTextContent('Last 7 days');
    await expectCounts([1, 2, 3]);
    expect(requests.requests).toHaveLength(2);
    await page.getByRole('button', { name: 'Clear date filter' }).click();
    await expectCounts([10, 20, 30]);
    expect(requests.requests).toHaveLength(3);
    expect(params(requests.requests.at(-1)!.url)).toEqual({ timezone });
  });

  it('keeps loading skeletons inside the cards and ignores a completed response for an older range', async () => {
    const notifications = vi.spyOn(QueryCache.prototype, 'notify');
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    fakeAdminEndpoint('GET', endpoint, async ({ url }) => {
      if (params(url).date_from === '2024-03-04') {
        await pending;
        return response('2024-03-04', [1, 2, 3]);
      }
      return params(url).date_from ? response('2024-02-10', [4, 5, 6]) : allTime();
    });
    try {
      await render();
      await expectCounts([10, 20, 30]);
      const cards = labels.map((label) => card(label).element());
      const chartCard = entries().element();
      await selectRange('Last 7 days');
      await expect
        .element(entries().getByRole('status'))
        .toHaveTextContent('Loading total entries');
      expect(entries().element()).toBe(chartCard);
      for (const [index, label] of labels.entries()) {
        expect(card(label).element()).toBe(cards[index]);
        expect(cards[index].querySelectorAll('.animate-pulse')).toHaveLength(1);
      }
      await selectRange('Last 30 days');
      await expectCounts([4, 5, 6]);
      // Wait for React Query to consume the old response, not just for the fake to return it.
      await act(async () => {
        finish();
        await expect
          .poll(() =>
            notifications.mock.calls.some(([event]) => {
              if (event.type !== 'updated' || event.action.type !== 'success') {
                return false;
              }
              const data = event.action.data as {
                automation_performance_stats?: AutomationPerformanceStats[];
              };
              return (
                data?.automation_performance_stats?.[0].entry_window.date_from === '2024-03-04'
              );
            }),
          )
          .toBe(true);
      });
      await expectCounts([4, 5, 6]);
    } finally {
      finish();
    }
  });

  it('shows one empty message in the list for all time, a period, and a status filter', async () => {
    fakeAdminEndpoint('GET', endpoint, ({ url }) =>
      response(params(url).date_from ? '2024-03-04' : '2023-12-01', [0, 0, 0]),
    );
    await render();
    const runs = () => page.getByRole('region', { name: 'Automation runs', exact: true });
    const expectEmpty = async (message: string) => {
      await expect.element(runs().getByRole('status')).toHaveTextContent(message);
      await expect(page.getByText(message, { exact: true })).toHaveCount(1);
      await expect.element(entries()).not.toHaveTextContent('No entries');
      await expectCounts([0, 0, 0]);
    };
    await expectEmpty('No entries yet');
    await selectRange('Last 7 days');
    await expectEmpty('No entries in this period');
    await card('Completed').click();
    await expectEmpty('No matching entries');
    await card('Completed').click();
    await expectEmpty('No entries in this period');
  });

  it('rejects a backend that ignores the date range and retries the selected range', async () => {
    fakeAdminEndpoint('GET', endpoint, allTime());
    await render();
    await expectCounts([10, 20, 30]);
    await selectRange('Last 7 days');
    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Could not load performance data');
    await expect.element(entries()).not.toBeInTheDocument();
    const retry = fakeAdminEndpoint('GET', endpoint, response('2024-03-04', [1, 2, 3]));
    await page.getByRole('button', { name: 'Retry' }).click();
    await expectCounts([1, 2, 3]);
    expect(retry.requests).toHaveLength(1);
    expect(params(retry.requests[0].url)).toEqual({
      date_from: '2024-03-04',
      date_to: '2024-03-10',
      timezone,
    });
  });
});
