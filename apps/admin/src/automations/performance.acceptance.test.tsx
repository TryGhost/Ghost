import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { settleRequests } from '@test-utils/acceptance/worker';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import type {
  AutomationDetail,
  AutomationEntryStats,
  AutomationStatusStats,
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
  window: {
    date_from: '2026-06-22',
    date_to: '2026-07-22',
    bucket: 'day',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
});
const response = (id: string, total = 1432, empty = false) => {
  const data = stats(id, total, empty);
  if (!empty) {
    const subtotal = data.entries.slice(0, -1).reduce((sum, entry) => sum + entry.count, 0);
    data.entries[data.entries.length - 1].count = total - subtotal;
  }
  return { automation_entry_stats: [data] };
};
const statusResponse = (id: string, counts: Partial<AutomationStatusStats> = {}) => ({
  automation_status_stats: [
    {
      automation_id: id,
      in_progress_run_count: 10,
      completed_run_count: 6,
      exited_early_run_count: 6,
      unclassified_run_count: 0,
      ...counts,
    },
  ],
});
const read = (id: string) => {
  fakeAdminEndpoint('GET', new RegExp(`^/automations/${id}/runs/(?:\\?|$)`), ({ url }) => ({
    automation_runs: [],
    meta: {
      entry_window: rangeResponse(url).automation_entry_stats[0].window,
      pagination: { limit: 50, next_cursor: null },
    },
  }));
  fakeAdminEndpoint('GET', new RegExp(`^/automations/${id}/status-stats/(?:\\?|$)`), ({ url }) =>
    statusResponse(id, { entry_window: rangeResponse(url).automation_entry_stats[0].window }),
  );
  return fakeAdminEndpoint('GET', `/automations/${id}/`, { automations: [detail(id)] });
};
const entries = () => page.getByRole('region', { name: 'Total entries' });
const open = () => page.getByRole('button', { name: 'Show performance' }).click();
const close = () => page.getByRole('button', { name: 'Hide performance' }).click();

describe('Automation total entries', () => {
  it('fetches on opening and shows the total and chart date labels', async () => {
    read('first');
    const request = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/entry-stats\/\?/,
      response('first'),
    );
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
    fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, body);
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
    fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, async () => {
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
      /^\/automations\/first\/entry-stats\/\?/,
      { errors: [{ message: 'Failed' }] },
      { status: 500 },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(entries().getByRole('alert')).toHaveTextContent('Could not load entries.');
    fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, response('first'));
    await entries().getByRole('button', { name: 'Retry' }).click();
    await expect.element(entries()).toHaveTextContent('1,432');
    await expect.element(entries().getByRole('alert')).not.toBeInTheDocument();
  });

  it('handles an older Core with no endpoint without displaying zero or a retry button', async () => {
    read('first');
    fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/entry-stats\/\?/,
      { errors: [{ message: 'Not found' }] },
      { status: 404 },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(entries())
      .toHaveTextContent('Entry analytics are unavailable on this version of Ghost.');
    await expect.element(entries().getByRole('figure')).not.toBeInTheDocument();
    await expect.element(entries().getByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it.each([
    { name: 'malformed', body: {} },
    { name: 'wrong automation', body: response('other') },
  ])('shows an error for a $name response', async ({ body }) => {
    read('first');
    fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, body);
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(entries().getByRole('alert')).toHaveTextContent('Could not load entries.');
    await expect.element(entries().getByRole('figure')).not.toBeInTheDocument();
  });

  it('caches the chart until the next page visit', async () => {
    read('first');
    const request = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/entry-stats\/\?/,
      response('first'),
    );
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
      /^\/automations\/first\/entry-stats\/\?/,
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
    const first = fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, async () => {
      await pending;
      return response('first');
    });
    fakeAdminEndpoint('GET', /^\/automations\/second\/entry-stats\/\?/, response('second', 2500));
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
      /^\/automations\/first\/entry-stats\/\?/,
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
    const request = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/entry-stats\/\?/,
      response('first'),
    );
    await renderAdminApp('/automations/first', { labs: { automations: true } });
    await expect.element(page.getByRole('button', { name: 'Wait: 1 day' })).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Show performance' }))
      .not.toBeInTheDocument();
    expect(request.requests).toHaveLength(0);
  });
});

const statuses = () => page.getByRole('region', { name: 'Automation status counts' });
const statusCard = (name: string) => statuses().getByRole('button', { name, exact: true });
const prepareStatuses = (id = 'first') => {
  read(id);
  fakeAdminEndpoint('GET', new RegExp(`^/automations/${id}/entry-stats/\\?`), response(id));
};

describe('Automation status counts', () => {
  it('fetches only when opened and renders three status counts', async () => {
    prepareStatuses();
    const request = fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/',
      statusResponse('first', {
        in_progress_run_count: 118,
        completed_run_count: 1260,
        exited_early_run_count: 54,
      }),
    );
    await renderAdminApp('/automations/first', flags);
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    expect(request.requests).toHaveLength(0);
    await open();
    await expect.element(statusCard('In progress')).toHaveTextContent('118');
    await expect.element(statusCard('Completed')).toHaveTextContent('1,260');
    await expect.element(statusCard('Exited early')).toHaveTextContent('54');
    await expect.element(statuses().getByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    await expect.element(entries()).toHaveTextContent('1,432');
    await expect
      .poll(() => document.querySelector('aside')?.getBoundingClientRect().width)
      .toBe(480);
    const content = statuses().element();
    await close();
    expect(content.isConnected).toBe(true);
    expect(content.closest('aside')?.inert).toBe(true);
  });

  it('keeps the chart and cards at a stable width throughout reopening', async () => {
    prepareStatuses();
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('6');
    await expect
      .poll(() => document.querySelector('aside')?.getBoundingClientRect().width)
      .toBe(480);
    const chartElement = entries().element();
    const expectedWidth = chartElement.getBoundingClientRect().width;
    await close();
    await expect.poll(() => document.querySelector('aside')?.getBoundingClientRect().width).toBe(0);
    const panel = chartElement.closest('aside')!;
    const cards = ['In progress', 'Completed', 'Exited early'].map((name) =>
      panel.querySelector(`button[aria-label="${name}"]`)!,
    );
    const expectedCardWidths = cards.map((card) => card.getBoundingClientRect().width);
    // Pause the real CSS transition and seek through it, independent of frame timing.
    const originalDuration = panel.style.transitionDuration;
    panel.style.transitionDuration = '100s';
    let transition: Animation | undefined;
    try {
      await open();
      transition = panel
        .getAnimations()
        .find(
          (animation) =>
            animation instanceof CSSTransition && animation.transitionProperty === 'width',
        );
      expect(transition).toBeDefined();
      transition!.pause();
      const duration = Number(transition!.effect!.getComputedTiming().duration);
      for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
        transition!.currentTime = duration * progress;
        const panelWidth = panel.getBoundingClientRect().width;
        if (progress > 0 && progress < 1) {
          expect(panelWidth).toBeGreaterThan(0);
          expect(panelWidth).toBeLessThan(480);
        }
        expect(chartElement.getBoundingClientRect().width).toBeCloseTo(expectedWidth, 0);
        cards.forEach((card, index) =>
          expect(card.getBoundingClientRect().width).toBeCloseTo(expectedCardWidths[index], 0),
        );
      }
    } finally {
      transition?.finish();
      panel.style.transitionDuration = originalDuration;
    }
    expect(entries().element()).toBe(chartElement);
    await close();
    expect(chartElement.isConnected).toBe(true);
    expect(document.querySelector('aside')?.inert).toBe(true);
    expect(chartElement.getBoundingClientRect().width).toBeCloseTo(expectedWidth, 0);
  });

  it('does not refetch the unchanged range or statuses on reopening, focus or reconnect', async () => {
    prepareStatuses();
    const chartRequest = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/entry-stats\/\?/,
      response('first'),
    );
    const statusRequest = fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/',
      statusResponse('first'),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('6');
    await expect.element(entries()).toHaveTextContent('1,432');
    await close();
    await open();
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));
    await expect
      .poll(() => document.querySelector('aside')?.getBoundingClientRect().width)
      .toBe(480);
    expect(chartRequest.requests).toHaveLength(1);
    expect(statusRequest.requests).toHaveLength(1);
    await expect.element(statuses()).not.toHaveTextContent('Updating');
  });

  it('keeps the loading and populated layout aligned, including a close while fetching', async () => {
    prepareStatuses();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const chartRequest = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/entry-stats\/\?/,
      async () => {
        await pending;
        return response('first');
      },
    );
    const statusRequest = fakeAdminEndpoint('GET', '/automations/first/status-stats/', async () => {
      await pending;
      return statusResponse('first');
    });
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(page.getByRole('status', { name: 'Loading total entries' })).toBeVisible();
    await expect
      .poll(() => document.querySelector('aside')?.getBoundingClientRect().width)
      .toBe(480);
    const chartHeight = entries().element().getBoundingClientRect().height;
    const cardTop = statusCard('Completed').element().getBoundingClientRect().top;
    const cardHeight = statusCard('Completed').element().getBoundingClientRect().height;
    await close();
    finish();
    await open();
    await expect.element(entries()).toHaveTextContent('1,432');
    await expect.element(statusCard('Completed')).toHaveTextContent('6');
    expect(entries().element().getBoundingClientRect().height).toBeCloseTo(chartHeight, 0);
    expect(statusCard('Completed').element().getBoundingClientRect().top).toBeCloseTo(cardTop, 0);
    expect(statusCard('Completed').element().getBoundingClientRect().height).toBeCloseTo(
      cardHeight,
      0,
    );
    expect(chartRequest.requests).toHaveLength(1);
    expect(statusRequest.requests).toHaveLength(1);
  });

  it('fits the sidebar to a narrow canvas without overflowing the chart or cards', async () => {
    await page.viewport(400, 800);
    try {
      prepareStatuses();
      await renderAdminApp('/automations/first', flags);
      await open();
      await expect.element(statusCard('Completed')).toHaveTextContent('6');
      const panel = document.querySelector('aside')!;
      const expectedWidth = panel.parentElement!.getBoundingClientRect().width;
      await expect.poll(() => panel.getBoundingClientRect().width).toBeCloseTo(expectedWidth, 0);
      expect(panel.scrollWidth).toBe(panel.clientWidth);
      for (const name of ['In progress', 'Completed', 'Exited early']) {
        const card = statusCard(name).element();
        expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
      }
      expect(statusCard('Completed').element().getBoundingClientRect().top).toBeGreaterThan(
        statusCard('In progress').element().getBoundingClientRect().top,
      );
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('stacks cards at larger font sizes without overflowing labels', async () => {
    prepareStatuses();
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('6');
    const inProgress = statusCard('In progress').element();
    const completed = statusCard('Completed').element();
    await expect
      .poll(() => inProgress.getBoundingClientRect().top === completed.getBoundingClientRect().top)
      .toBe(true);
    document.documentElement.style.fontSize = '100%';
    try {
      await expect
        .poll(() => completed.getBoundingClientRect().top > inProgress.getBoundingClientRect().top)
        .toBe(true);
      for (const name of ['In progress', 'Completed', 'Exited early']) {
        const card = statusCard(name).element();
        expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
      }
    } finally {
      document.documentElement.style.fontSize = '62.5%';
    }
  });

  it('shows loading until successful zero counts arrive', async () => {
    prepareStatuses();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    fakeAdminEndpoint('GET', '/automations/first/status-stats/', async () => {
      await pending;
      return statusResponse('first', {
        in_progress_run_count: 0,
        completed_run_count: 0,
        exited_early_run_count: 0,
      });
    });
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(statuses().getByRole('status'))
      .toHaveTextContent('Loading automation statuses');
    await expect.element(statusCard('Completed')).not.toHaveTextContent('0');
    finish();
    for (const name of ['In progress', 'Completed', 'Exited early']) {
      await expect.element(statusCard(name)).toHaveTextContent('0');
    }
    await expect.element(statuses().getByRole('status')).not.toBeInTheDocument();
  });

  it.each([1, 25])(
    'identifies incomplete history without adding a fourth card (%s)',
    async (count) => {
      prepareStatuses();
      fakeAdminEndpoint(
        'GET',
        '/automations/first/status-stats/',
        statusResponse('first', { unclassified_run_count: count }),
      );
      await renderAdminApp('/automations/first', flags);
      await open();
      await expect
        .element(statuses().getByRole('status'))
        .toHaveTextContent(
          `Status is unavailable for ${count} ${count === 1 ? 'entry' : 'entries'}.`,
        );
      await expect(statuses().getByRole('button')).toHaveCount(3);
      await expect.element(statusCard('Completed')).toHaveTextContent('6');
    },
  );

  it('retries a failed status request while the chart remains available', async () => {
    prepareStatuses();
    fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/',
      { errors: [{ message: 'Failed' }] },
      { status: 500 },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(statuses().getByRole('alert'))
      .toHaveTextContent('Could not load status counts.');
    await expect.element(statusCard('Completed')).toHaveTextContent('—');
    await expect.element(entries()).toHaveTextContent('1,432');
    fakeAdminEndpoint('GET', '/automations/first/status-stats/', statusResponse('first'));
    await statuses().getByRole('button', { name: 'Retry' }).click();
    await expect.element(statusCard('Completed')).toHaveTextContent('6');
    await expect.element(statuses().getByRole('alert')).not.toBeInTheDocument();
  });

  it('shows unavailable values for older Core without a retry or false zeros', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/status-stats/', {}, { status: 404 });
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(statuses().getByRole('status'))
      .toHaveTextContent('Status counts are unavailable on this version of Ghost.');
    for (const name of ['In progress', 'Completed', 'Exited early']) {
      await expect.element(statusCard(name)).toHaveTextContent('—');
    }
    await expect.element(statuses().getByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it.each([
    { name: 'malformed', body: {} },
    { name: 'wrong automation', body: statusResponse('other') },
  ])('shows an error for a $name response', async ({ body }) => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/status-stats/', body);
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(statuses().getByRole('alert'))
      .toHaveTextContent('Could not load status counts.');
    await expect.element(statusCard('Completed')).toHaveTextContent('—');
  });

  it('keeps a failed request across reopening until explicitly retried', async () => {
    prepareStatuses();
    const request = fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/',
      { errors: [{ message: 'Failed' }] },
      { status: 500 },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(statuses().getByRole('alert'))
      .toHaveTextContent('Could not load status counts.');
    await close();
    await open();
    await expect
      .element(statuses().getByRole('alert'))
      .toHaveTextContent('Could not load status counts.');
    await expect
      .poll(() => document.querySelector('aside')?.getBoundingClientRect().width)
      .toBe(480);
    expect(request.requests).toHaveLength(1);
    fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/',
      statusResponse('first', { completed_run_count: 1300 }),
    );
    await statuses().getByRole('button', { name: 'Retry' }).click();
    await expect.element(statusCard('Completed')).toHaveTextContent('1,300');
  });

  it('keeps requests scoped through navigation and late responses', async () => {
    prepareStatuses();
    prepareStatuses('second');
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const first = fakeAdminEndpoint('GET', '/automations/first/status-stats/', async () => {
      await pending;
      return statusResponse('first');
    });
    fakeAdminEndpoint(
      'GET',
      '/automations/second/status-stats/',
      statusResponse('second', { completed_run_count: 2500 }),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.poll(() => first.requests.length).toBe(1);
    window.location.hash = '#/automations/second';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('2,500');
    finish();
    await close();
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('2,500');
    const revisit = fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/',
      statusResponse('first', { completed_run_count: 1600 }),
    );
    window.location.hash = '#/automations/first';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('1,600');
    await expect.poll(() => revisit.requests.length).toBe(1);
  });

  it('does not request counts with run analytics disabled', async () => {
    prepareStatuses();
    const request = fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/',
      statusResponse('first'),
    );
    await renderAdminApp('/automations/first', { labs: { automations: true } });
    await expect.element(page.getByRole('button', { name: 'Wait: 1 day' })).toBeVisible();
    expect(request.requests).toHaveLength(0);
    await expect.element(statuses()).not.toBeInTheDocument();
  });
});

const selectRange = async (label: string) => {
  await page.getByRole('button', { name: 'Filter performance' }).click();
  await page.getByRole('menuitemradio', { name: label, exact: true }).click();
};
const rangeResponse = (url: string, count = 3) => {
  const params = new URL(url).searchParams;
  const from = params.get('date_from');
  const to = params.get('date_to');
  if (!from || !to) {
    return response('first');
  }
  const start = Date.parse(from);
  const end = Date.parse(to) + 86400000;
  const days = (end - start) / 86400000;
  return {
    automation_entry_stats: [
      {
        automation_id: 'first',
        total_run_count: count * days,
        entries: Array.from({ length: days }, (_, i) => ({
          date: new Date(start + i * 86400000).toISOString().slice(0, 10),
          count,
        })),
        window: {
          date_from: from,
          date_to: new Date(end).toISOString().slice(0, 10),
          bucket: 'day' as const,
          timezone: params.get('timezone')!,
        },
      },
    ],
  };
};

describe('Automation performance dates', () => {
  it('announces the selected date range and supports keyboard selection', async () => {
    read('first');
    fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, ({ url }) =>
      rangeResponse(url),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    const trigger = page.getByRole('button', { name: 'Filter performance' });
    trigger.element().focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect
      .element(page.getByRole('menuitemradio', { name: 'All time', checked: true }))
      .toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(page.getByRole('menuitemradio', { name: 'Last 7 days' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.element(entries().getByText('21', { exact: true })).toBeVisible();
    await expect.element(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect
      .element(page.getByRole('menuitemradio', { name: 'Last 7 days', checked: true }))
      .toBeVisible();
    await expect
      .element(page.getByRole('menuitemradio', { name: 'All time', checked: false }))
      .toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(trigger).toHaveFocus();
  });

  it('caches visited entry ranges until navigating away from the automation', async () => {
    read('first');
    read('second');
    let countPerDay = 3;
    const requests = fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, ({ url }) =>
      rangeResponse(url, countPerDay),
    );
    fakeAdminEndpoint('GET', /^\/automations\/second\/entry-stats\/\?/, response('second'));
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(entries().getByText('1,432', { exact: true })).toBeVisible();
    await selectRange('Last 7 days');
    await expect.element(entries().getByText('21', { exact: true })).toBeVisible();
    await selectRange('Last 30 days');
    await expect.element(entries().getByText('90', { exact: true })).toBeVisible();
    countPerDay = 5;
    await selectRange('Last 7 days');
    await expect.element(entries().getByText('21', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Clear date filter' }).click();
    await expect.element(entries().getByText('1,432', { exact: true })).toBeVisible();
    await settleRequests();
    expect(requests.requests).toHaveLength(3);

    window.location.hash = '#/automations/second';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    window.location.hash = '#/automations/first';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await open();
    await expect.element(entries().getByText('1,432', { exact: true })).toBeVisible();
    await selectRange('Last 7 days');
    await expect.element(entries().getByText('35', { exact: true })).toBeVisible();
    expect(requests.requests).toHaveLength(5);
  });

  it('keeps a revisited range error until explicitly retried', async () => {
    read('first');
    fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, response('first'));
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(entries().getByText('1,432', { exact: true })).toBeVisible();
    const failed = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/entry-stats\/\?/,
      {},
      { status: 500 },
    );
    await selectRange('Last 7 days');
    await expect.element(entries().getByRole('alert')).toHaveTextContent('Could not load entries.');
    await page.getByRole('button', { name: 'Clear date filter' }).click();
    await expect.element(entries().getByText('1,432', { exact: true })).toBeVisible();
    await selectRange('Last 7 days');
    await expect.element(entries().getByRole('alert')).toHaveTextContent('Could not load entries.');
    await settleRequests();
    expect(failed.requests).toHaveLength(1);
    const retried = fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, ({ url }) =>
      rangeResponse(url),
    );
    await entries().getByRole('button', { name: 'Retry' }).click();
    await expect.element(entries().getByText('21', { exact: true })).toBeVisible();
    expect(retried.requests).toHaveLength(1);
    expect(retried.lastRequest!.url).toBe(failed.lastRequest!.url);
  });

  it('uses the same entry dates for the chart, current status counts and member list', async () => {
    read('first');
    const statusRequests = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/status-stats\/(?:\?|$)/,
      ({ url }) => {
        const entry = rangeResponse(url).automation_entry_stats[0];
        const count = new URL(url).searchParams.has('date_from') ? entry.entries.length : 10;
        return statusResponse('first', {
          in_progress_run_count: count,
          completed_run_count: count,
          exited_early_run_count: count,
          entry_window: entry.window,
        });
      },
    );
    const listRequests = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/runs\/(?:\?|$)/,
      ({ url }) => ({
        automation_runs: [],
        meta: {
          entry_window: rangeResponse(url).automation_entry_stats[0].window,
          pagination: { limit: 50, next_cursor: null },
        },
      }),
    );
    const requests = fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, ({ url }) =>
      rangeResponse(url),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(statusCard('In progress')).toHaveTextContent('10');
    for (const days of [7, 30, 90]) {
      await selectRange(`Last ${days} days`);
      await expect.element(entries()).toHaveTextContent(String(days * 3));
      await expect.element(statusCard('In progress')).toHaveTextContent(String(days));
      await expect.element(statusCard('Completed')).toHaveTextContent(String(days));
      await expect.element(statusCard('Exited early')).toHaveTextContent(String(days));
      await settleRequests();
      const query = new URL(requests.lastRequest!.url).searchParams;
      for (const capture of [statusRequests, listRequests]) {
        const params = new URL(capture.lastRequest!.url).searchParams;
        for (const key of ['date_from', 'date_to', 'timezone']) {
          expect(params.get(key)).toBe(query.get(key));
        }
        expect(params.has('cursor')).toBe(false);
      }
    }
    const count = statusRequests.requests.length;
    await close();
    await open();
    await expect.element(statusCard('In progress')).toHaveTextContent('90');
    expect(statusRequests.requests.length).toBe(count);
    await page.getByRole('button', { name: 'Clear date filter' }).click();
    await expect.element(entries().getByText('1,432', { exact: true })).toBeVisible();
    await expect.element(statusCard('In progress')).toHaveTextContent('10');
  });

  it('does not show unfiltered cards or rows when older Core ignores entry dates', async () => {
    prepareStatuses();
    fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/status-stats\/(?:\?|$)/,
      statusResponse('first'),
    );
    fakeAdminEndpoint('GET', /^\/automations\/first\/runs\/(?:\?|$)/, runsResponse());
    fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, ({ url }) =>
      rangeResponse(url),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(2);
    await selectRange('Last 7 days');
    await expect.element(statuses()).toHaveTextContent('Status counts are unavailable');
    await expect.element(runsRegion()).toHaveTextContent('unavailable');
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear date filter' }).click();
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(2);
  });

  it('hides old totals while a range loads and ignores its late response after another selection', async () => {
    read('first');
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requests = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/entry-stats\/\?/,
      async ({ url }) => {
        const params = new URL(url).searchParams;
        if (
          params.has('date_from') &&
          (Date.parse(params.get('date_to')!) - Date.parse(params.get('date_from')!)) / 86400000 ===
            6
        ) {
          await gate;
        }
        return rangeResponse(url);
      },
    );
    try {
      await renderAdminApp('/automations/first', flags);
      await open();
      await expect.element(entries().getByText('1,432', { exact: true })).toBeVisible();
      await selectRange('Last 7 days');
      await expect.poll(() => requests.requests.length).toBe(2);
      await expect
        .element(entries().getByRole('status', { name: 'Loading total entries' }))
        .toBeVisible();
      await expect.element(entries()).not.toHaveTextContent('1,432');
      await selectRange('Last 30 days');
      await expect.element(entries().getByText('90', { exact: true })).toBeVisible();
      release();
      await settleRequests();
      await expect.element(entries().getByText('90', { exact: true })).toBeVisible();
      await expect.element(entries()).not.toHaveTextContent('21');
    } finally {
      release();
    }
  });

  it('distinguishes an empty range from a failed query and retries the selected range', async () => {
    read('first');
    fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, ({ url }) =>
      rangeResponse(url, 0),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await selectRange('Last 7 days');
    await expect.element(entries()).toHaveTextContent('No entries in this period');
    const failed = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/entry-stats\/\?/,
      { errors: [{ message: 'Unavailable', type: 'InternalServerError' }] },
      { status: 500 },
    );
    await selectRange('Last 30 days');
    await expect.element(entries().getByRole('alert')).toHaveTextContent('Could not load entries.');
    await expect.element(entries()).not.toHaveTextContent('No entries in this period');
    const retry = fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, ({ url }) =>
      rangeResponse(url),
    );
    await entries().getByRole('button', { name: 'Retry' }).click();
    await expect.element(entries().getByText('90', { exact: true })).toBeVisible();
    expect(retry.lastRequest!.url).toBe(failed.lastRequest!.url);
    await expect.element(statusCard('Completed')).toHaveTextContent('6');
  });

  it('resets the range on another automation and ignores the previous page response', async () => {
    read('first');
    read('second');
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/entry-stats\/\?/,
      async ({ url }) => {
        if (new URL(url).searchParams.has('date_from')) {
          await gate;
        }
        return rangeResponse(url);
      },
    );
    const second = fakeAdminEndpoint(
      'GET',
      /^\/automations\/second\/entry-stats\/\?/,
      response('second', 2500),
    );
    try {
      await renderAdminApp('/automations/first', flags);
      await open();
      await expect.element(entries().getByText('1,432', { exact: true })).toBeVisible();
      await selectRange('Last 7 days');
      await expect.poll(() => first.requests.length).toBe(2);
      window.location.hash = '#/automations/second';
      await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
      await open();
      await expect.element(entries().getByText('2,500', { exact: true })).toBeVisible();
      expect(new URL(second.lastRequest!.url).searchParams.has('date_from')).toBe(false);
      await expect
        .element(page.getByRole('button', { name: 'Clear date filter' }))
        .not.toBeInTheDocument();
      release();
      await settleRequests();
      await expect.element(entries().getByText('2,500', { exact: true })).toBeVisible();
    } finally {
      release();
    }
  });

  it('treats an unfiltered response to a filtered request as unavailable and allows clearing', async () => {
    read('first');
    fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, response('first'));
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(entries().getByText('1,432', { exact: true })).toBeVisible();
    await selectRange('Last 7 days');
    await expect
      .element(entries())
      .toHaveTextContent('Entry analytics are unavailable for this date range.');
    await expect.element(entries()).not.toHaveTextContent('1,432');
    await page.getByRole('button', { name: 'Clear date filter' }).click();
    await expect.element(entries().getByText('1,432', { exact: true })).toBeVisible();
  });
});

const runsRegion = () => page.getByRole('region', { name: 'Automation runs', exact: true });
const runsResponse = () => ({
  automation_runs: Array.from({ length: 10 }, (_, i) => ({
    id: `run-${10 - i}`,
    failed: i === 6,
    created_at: new Date(Date.UTC(2026, 8, 14 - i, 12)).toISOString(),
    status: (['in_progress', 'completed', 'exited_early', 'unclassified'] as const)[i % 4],
    member:
      i === 2
        ? null
        : {
            id: i < 2 ? 'repeat-member' : `member-${i}`,
            name: i < 2 ? 'Noah Bennett' : i === 3 ? ' ' : `Member ${i}`,
            email:
              i < 2
                ? 'noah@example.com'
                : i === 3
                  ? 'no-name@example.com'
                  : `member-${i}@example.com`,
          },
  })),
});

describe('Automation run list', () => {
  it('fetches on first opening and shows ten runs in server order with member and status fallbacks', async () => {
    prepareStatuses();
    const request = fakeAdminEndpoint('GET', '/automations/first/runs/', runsResponse());
    await renderAdminApp('/automations/first', flags);
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    expect(request.requests).toHaveLength(0);
    await open();
    await expect(runsRegion().getByRole('row')).toHaveCount(11);
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(2);
    await expect(runsRegion().getByText('noah@example.com', { exact: true })).toHaveCount(2);
    await expect.element(runsRegion().getByText('Deleted member')).toBeVisible();
    await expect.element(runsRegion().getByText('no-name@example.com')).toBeVisible();
    await expect(runsRegion().getByText('no-name@example.com', { exact: true })).toHaveCount(1);
    expect(
      Array.from(runsRegion().element().querySelectorAll('time')).map((time) => time.dateTime),
    ).toEqual(runsResponse().automation_runs.map((run) => run.created_at));
    for (const label of ['In progress', 'Completed', 'Exited early', 'Unclassified']) {
      await expect.element(runsRegion().getByRole('img', { name: label }).first()).toBeVisible();
    }
    await expect
      .element(runsRegion().getByRole('columnheader', { name: 'Entered' }))
      .toHaveAttribute('aria-sort', 'descending');
    await expect
      .element(runsRegion().getByRole('img', { name: 'Exited early — Failed', exact: true }))
      .toHaveAttribute('title', 'Exited early — Failed');
    await expect(runsRegion().getByRole('link')).toHaveCount(0);
    await expect(runsRegion().getByRole('button', { name: /^View run history for / })).toHaveCount(
      10,
    );
    await expect(runsRegion().getByRole('button', { name: 'Retry' })).toHaveCount(0);
    expect(request.requests).toHaveLength(1);
    await expect
      .poll(() => document.querySelector('aside')?.getBoundingClientRect().width)
      .toBe(480);
  });

  it('keeps a request running through closing and replaces loading with the empty state', async () => {
    prepareStatuses();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const request = fakeAdminEndpoint('GET', '/automations/first/runs/', async () => {
      await pending;
      return { automation_runs: [] };
    });
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(runsRegion().getByRole('status'))
      .toHaveTextContent('Loading automation runs');
    await expect.element(runsRegion()).not.toHaveTextContent('No entries yet.');
    await close();
    finish();
    await open();
    await expect.element(runsRegion().getByRole('status')).toHaveTextContent('No entries yet.');
    expect(request.requests).toHaveLength(1);
  });

  it('keeps runs on reopening but restarts the list when dates change or clear', async () => {
    prepareStatuses();
    read('second');
    fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, ({ url }) =>
      rangeResponse(url),
    );
    const request = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/runs\/(?:\?|$)/,
      ({ url }) => ({
        ...runsResponse(),
        meta: {
          entry_window: rangeResponse(url).automation_entry_stats[0].window,
          pagination: { limit: 50, next_cursor: null },
        },
      }),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(2);
    await close();
    await open();
    await selectRange('Last 7 days');
    await expect.element(entries().getByText('21', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Clear date filter' }).click();
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    await settleRequests();
    expect(request.requests).toHaveLength(3);
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(2);
    window.location.hash = '#/automations/second';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    window.location.hash = '#/automations/first';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    expect(request.requests).toHaveLength(3);
    await open();
    await expect.poll(() => request.requests.length).toBe(4);
  });

  it('keeps errors until explicit retry without disrupting the chart or counts', async () => {
    prepareStatuses();
    const request = fakeAdminEndpoint('GET', '/automations/first/runs/', {}, { status: 500 });
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(runsRegion().getByRole('alert'))
      .toHaveTextContent('Could not load automation runs.');
    await expect.element(entries()).toHaveTextContent('1,432');
    await expect.element(statusCard('Completed')).toHaveTextContent('6');
    await close();
    await open();
    await expect.element(runsRegion().getByRole('alert')).toBeVisible();
    await settleRequests();
    expect(request.requests).toHaveLength(1);
    fakeAdminEndpoint('GET', '/automations/first/runs/', runsResponse());
    await runsRegion().getByRole('button', { name: 'Retry' }).click();
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(2);
    await expect.element(runsRegion().getByRole('alert')).not.toBeInTheDocument();
  });

  it('shows unavailable for a missing endpoint without a retry or false empty state', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/runs/', {}, { status: 404 });
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(runsRegion().getByRole('status'))
      .toHaveTextContent('The run list is unavailable on this version of Ghost.');
    await expect.element(runsRegion()).not.toHaveTextContent('No entries yet.');
    await expect(runsRegion().getByRole('button', { name: 'Retry' })).toHaveCount(0);
  });

  it('shows a malformed response as an error', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/runs/', {});
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(runsRegion().getByRole('alert'))
      .toHaveTextContent('Could not load automation runs.');
    await expect.element(runsRegion()).not.toHaveTextContent('No entries yet.');
  });

  it('discards a pending request on navigation, including returning before it resolves', async () => {
    prepareStatuses();
    prepareStatuses('second');
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const stale = runsResponse();
    stale.automation_runs[0].member!.name = 'Stale member';
    const first = fakeAdminEndpoint('GET', '/automations/first/runs/', async () => {
      await pending;
      return stale;
    });
    const second = runsResponse();
    second.automation_runs[0].member!.name = 'Second automation';
    fakeAdminEndpoint('GET', '/automations/second/runs/', second);
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.poll(() => first.requests.length).toBe(1);
    window.location.hash = '#/automations/second';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await open();
    await expect.element(runsRegion()).toHaveTextContent('Second automation');
    await expect.element(runsRegion()).not.toHaveTextContent('Stale member');
    const fresh = runsResponse();
    fresh.automation_runs[0].member!.name = 'Fresh member';
    const revisit = fakeAdminEndpoint('GET', '/automations/first/runs/', fresh);
    window.location.hash = '#/automations/first';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await open();
    await expect.element(runsRegion()).toHaveTextContent('Fresh member');
    expect(revisit.requests).toHaveLength(1);
    finish();
    await settleRequests();
    await expect.element(runsRegion()).not.toHaveTextContent('Stale member');
    await expect.element(runsRegion()).toHaveTextContent('Fresh member');
  });

  it('fits long member names and emails inside a narrow sidebar', async () => {
    await page.viewport(400, 800);
    try {
      prepareStatuses();
      const body = runsResponse();
      body.automation_runs[0].member!.name = 'A very long member name '.repeat(10);
      body.automation_runs[1].member!.name = '';
      body.automation_runs[1].member!.email = `${'long'.repeat(20)}@example.com`;
      fakeAdminEndpoint('GET', '/automations/first/runs/', body);
      await renderAdminApp('/automations/first', flags);
      await open();
      await expect(runsRegion().getByRole('row')).toHaveCount(11);
      await expect
        .element(runsRegion().getByRole('img', { name: 'Completed' }).first())
        .toBeVisible();
      const panel = document.querySelector('aside')!;
      const expectedWidth = panel.parentElement!.getBoundingClientRect().width;
      await expect.poll(() => panel.getBoundingClientRect().width).toBeCloseTo(expectedWidth, 0);
      expect(panel.scrollWidth).toBe(panel.clientWidth);
      const table = runsRegion().getByRole('table').element();
      expect(table.getBoundingClientRect().width).toBeLessThanOrEqual(
        runsRegion().element().clientWidth,
      );
    } finally {
      await page.viewport(1280, 800);
    }
  });
});

const filteredRunsResponse = (
  status: 'in_progress' | 'completed' | 'exited_early',
  name: string,
) => ({
  automation_runs: [
    {
      ...runsResponse().automation_runs[0],
      id: `${status}-run`,
      status,
      member: { id: `${status}-member`, name, email: `${status}@example.com` },
    },
  ],
});

describe('Automation run status filtering', () => {
  it('refreshes counts and runs on each status change while keeping the entries chart independent', async () => {
    prepareStatuses();
    let refresh = 0;
    const summary = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/status-stats\/(?:\?|$)/,
      ({ url }) => {
        const refreshedCounts = statusResponse('first', {
          entry_window: rangeResponse(url).automation_entry_stats[0].window,
          completed_run_count: 6 + refresh,
        });
        refresh += 1;
        return refreshedCounts;
      },
    );
    const chart = fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, ({ url }) =>
      rangeResponse(url),
    );
    const all = fakeAdminEndpoint('GET', '/automations/first/runs/', runsResponse());
    const completed = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/runs\/\?.*status=completed/,
      ({ url }) => ({
        ...filteredRunsResponse('completed', 'Completed member'),
        meta: {
          entry_window: rangeResponse(url).automation_entry_stats[0].window,
          pagination: { limit: 50, next_cursor: null },
        },
      }),
    );
    const exited = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=exited_early',
      filteredRunsResponse('exited_early', 'Exited member'),
    );
    const pending = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=in_progress',
      filteredRunsResponse('in_progress', 'Pending member'),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(2);
    await statusCard('Completed').click();
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'true');
    await expect.element(runsRegion()).toHaveTextContent('Completed member');
    await expect.element(statusCard('Completed')).toHaveAccessibleDescription('7');
    await statusCard('Exited early').click();
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'false');
    await expect.element(statusCard('Exited early')).toHaveAttribute('aria-pressed', 'true');
    await expect.element(runsRegion()).toHaveTextContent('Exited member');
    await statusCard('In progress').click();
    await expect.element(runsRegion()).toHaveTextContent('Pending member');
    await statusCard('In progress').click();
    await expect.element(statusCard('In progress')).toHaveAttribute('aria-pressed', 'false');
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(2);
    await expect.element(entries().getByText('1,432', { exact: true })).toBeVisible();
    expect(chart.requests).toHaveLength(1);
    expect(summary.requests).toHaveLength(5);
    await statusCard('Completed').click();
    await selectRange('Last 7 days');
    await expect.element(entries().getByText('21', { exact: true })).toBeVisible();
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'true');
    await expect.element(statusCard('Completed')).toHaveTextContent('12');
    await expect.element(runsRegion()).toHaveTextContent('Completed member');
    await close();
    await open();
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    await settleRequests();
    expect(all.requests).toHaveLength(2);
    expect(completed.requests).toHaveLength(3);
    expect(exited.requests).toHaveLength(1);
    expect(pending.requests).toHaveLength(1);
    expect(summary.requests).toHaveLength(7);
    await expect.element(statusCard('In progress')).toHaveTextContent('10');
    await expect.element(statusCard('Exited early')).toHaveTextContent('6');
  });

  it('supports Tab, Space and Enter on status cards', async () => {
    prepareStatuses();
    fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=completed',
      filteredRunsResponse('completed', 'Keyboard member'),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    statusCard('In progress').element().focus();
    await userEvent.tab();
    await expect.element(statusCard('Completed')).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'true');
    await expect.element(runsRegion()).toHaveTextContent('Keyboard member');
    await userEvent.keyboard('{Enter}');
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'false');
    await expect.element(runsRegion().getByRole('status')).toHaveTextContent('No entries yet.');
  });

  it('allows zero-count cards to show no matches and clear the filter', async () => {
    prepareStatuses();
    fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/',
      statusResponse('first', { completed_run_count: 0 }),
    );
    fakeAdminEndpoint('GET', '/automations/first/runs/?status=completed', { automation_runs: [] });
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('0');
    await statusCard('Completed').click();
    await expect
      .element(runsRegion().getByRole('status'))
      .toHaveTextContent('No matching entries.');
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'true');
    await statusCard('Completed').click();
    await expect.element(runsRegion().getByRole('status')).toHaveTextContent('No entries yet.');
  });

  it('refetches a failed filter on reselection and supports explicit retry while idle', async () => {
    prepareStatuses();
    const request = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=completed',
      {},
      { status: 500 },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await statusCard('Completed').click();
    await expect
      .element(runsRegion().getByRole('alert'))
      .toHaveTextContent('Could not load automation runs.');
    await statusCard('Completed').click();
    await expect.element(runsRegion().getByRole('status')).toHaveTextContent('No entries yet.');
    await statusCard('Completed').click();
    await expect.element(runsRegion().getByRole('alert')).toBeVisible();
    await settleRequests();
    expect(request.requests).toHaveLength(2);
    const retry = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=completed',
      filteredRunsResponse('completed', 'Recovered member'),
    );
    await runsRegion().getByRole('button', { name: 'Retry' }).click();
    await expect.element(runsRegion()).toHaveTextContent('Recovered member');
    expect(retry.requests).toHaveLength(1);
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps fresh runs usable when refreshing counts fails and retries counts independently', async () => {
    prepareStatuses();
    const runs = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=completed',
      filteredRunsResponse('completed', 'Completed member'),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(statusCard('Completed')).toHaveAccessibleDescription('6');
    const failed = fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/',
      {},
      { status: 500 },
    );
    await statusCard('Completed').click();
    await expect.element(runsRegion()).toHaveTextContent('Completed member');
    await expect
      .element(statuses().getByRole('alert'))
      .toHaveTextContent('Could not load status counts.');
    await expect.element(statusCard('Completed')).toHaveAccessibleDescription('Unavailable');
    await close();
    await open();
    await settleRequests();
    expect(failed.requests).toHaveLength(1);
    const retry = fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/',
      statusResponse('first', { completed_run_count: 7 }),
    );
    await statuses().getByRole('button', { name: 'Retry' }).click();
    await expect.element(statusCard('Completed')).toHaveAccessibleDescription('7');
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'true');
    expect(retry.requests).toHaveLength(1);
    expect(runs.requests).toHaveLength(1);
  });

  it('shows unavailable for a filtered 404 and allows clearing back to the list', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/runs/?status=completed', {}, { status: 404 });
    await renderAdminApp('/automations/first', flags);
    await open();
    await statusCard('Completed').click();
    await expect
      .element(runsRegion().getByRole('status'))
      .toHaveTextContent('The run list is unavailable on this version of Ghost.');
    await expect(runsRegion().getByRole('button', { name: 'Retry' })).toHaveCount(0);
    await expect.element(runsRegion()).not.toHaveTextContent('No matching entries.');
    await statusCard('Completed').click();
    await expect.element(runsRegion().getByRole('status')).toHaveTextContent('No entries yet.');
  });

  it('discards late counts and runs when returning to a filter before its first request resolves', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/runs/', runsResponse());
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const slow = fakeAdminEndpoint('GET', '/automations/first/runs/?status=completed', async () => {
      await pending;
      return filteredRunsResponse('completed', 'Late completed member');
    });
    let summaryRequests = 0;
    fakeAdminEndpoint('GET', '/automations/first/status-stats/', async () => {
      summaryRequests += 1;
      const requestNumber = summaryRequests;
      if (requestNumber === 2) {
        await pending;
      }
      return statusResponse('first', { completed_run_count: requestNumber });
    });
    fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=exited_early',
      filteredRunsResponse('exited_early', 'Current exited member'),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(2);
    await statusCard('Completed').click();
    await expect.poll(() => slow.requests.length).toBe(1);
    await expect
      .element(runsRegion().getByRole('status'))
      .toHaveTextContent('Loading automation runs');
    await expect.element(runsRegion()).not.toHaveTextContent('Noah Bennett');
    await statusCard('Exited early').click();
    await expect.element(runsRegion()).toHaveTextContent('Current exited member');
    const fresh = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=completed',
      filteredRunsResponse('completed', 'Fresh completed member'),
    );
    await statusCard('Completed').click();
    await expect.element(runsRegion()).toHaveTextContent('Fresh completed member');
    await expect.element(statusCard('Completed')).toHaveAccessibleDescription('4');
    expect(fresh.requests).toHaveLength(1);
    finish();
    await settleRequests();
    await expect.element(runsRegion()).not.toHaveTextContent('Late completed member');
    await expect.element(runsRegion()).toHaveTextContent('Fresh completed member');
    await expect.element(statusCard('Completed')).toHaveAccessibleDescription('4');
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'true');
  });

  it('clears selection and fetches fresh results on automation navigation, including pending results', async () => {
    prepareStatuses();
    prepareStatuses('second');
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const old = fakeAdminEndpoint('GET', '/automations/first/runs/?status=completed', async () => {
      await pending;
      return filteredRunsResponse('completed', 'Previous visit');
    });
    fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=exited_early',
      filteredRunsResponse('exited_early', 'Cached previous visit'),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await statusCard('Exited early').click();
    await expect.element(runsRegion()).toHaveTextContent('Cached previous visit');
    await statusCard('Completed').click();
    await expect.poll(() => old.requests.length).toBe(1);
    window.location.hash = '#/automations/second';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await open();
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'false');
    await expect.element(runsRegion().getByRole('status')).toHaveTextContent('No entries yet.');
    const fresh = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=completed',
      filteredRunsResponse('completed', 'New visit'),
    );
    const freshExited = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=exited_early',
      filteredRunsResponse('exited_early', 'Fresh exited member'),
    );
    window.location.hash = '#/automations/first';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await open();
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'false');
    await statusCard('Completed').click();
    await expect.element(runsRegion()).toHaveTextContent('New visit');
    expect(fresh.requests).toHaveLength(1);
    await statusCard('Exited early').click();
    await expect.element(runsRegion()).toHaveTextContent('Fresh exited member');
    expect(freshExited.requests).toHaveLength(1);
    finish();
    await settleRequests();
    await expect.element(runsRegion()).not.toHaveTextContent('Previous visit');
  });
});

describe('Automation run sorting', () => {
  const enteredHeader = () => runsRegion().getByRole('columnheader', { name: 'Entered' });
  const sortButton = () => runsRegion().getByRole('button', { name: 'Entered', exact: true });
  const ascendingResponse = () => ({
    automation_runs: [...runsResponse().automation_runs].reverse(),
  });
  const enteredTimes = () =>
    Array.from(runsRegion().element().querySelectorAll('time')).map((time) => time.dateTime);

  it('toggles between newest and oldest first, refetching only the list', async () => {
    prepareStatuses();
    const summary = fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/',
      statusResponse('first'),
    );
    const chart = fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, ({ url }) =>
      rangeResponse(url),
    );
    const newest = fakeAdminEndpoint('GET', '/automations/first/runs/', runsResponse());
    const oldest = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?order=created_at+asc',
      ascendingResponse(),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect(runsRegion().getByRole('row')).toHaveCount(11);
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'descending');
    await sortButton().click();
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'ascending');
    await expect
      .poll(enteredTimes)
      .toEqual(ascendingResponse().automation_runs.map((run) => run.created_at));
    await sortButton().click();
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'descending');
    await expect
      .poll(enteredTimes)
      .toEqual(runsResponse().automation_runs.map((run) => run.created_at));
    expect(newest.requests).toHaveLength(2);
    expect(oldest.requests).toHaveLength(1);
    expect(summary.requests).toHaveLength(1);
    expect(chart.requests).toHaveLength(1);
  });

  it('keeps the direction across closing, reopening, focus and reconnect without refetching', async () => {
    prepareStatuses();
    const oldest = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?order=created_at+asc',
      ascendingResponse(),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await sortButton().click();
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'ascending');
    await expect.poll(() => oldest.requests.length).toBe(1);
    await close();
    await open();
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    await settleRequests();
    expect(oldest.requests).toHaveLength(1);
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'ascending');
  });

  it('resets to newest first on automation navigation', async () => {
    prepareStatuses();
    prepareStatuses('second');
    const newest = fakeAdminEndpoint('GET', '/automations/first/runs/', runsResponse());
    const oldest = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?order=created_at+asc',
      ascendingResponse(),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await sortButton().click();
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'ascending');
    await expect.poll(() => oldest.requests.length).toBe(1);
    window.location.hash = '#/automations/second';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await open();
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'descending');
    window.location.hash = '#/automations/first';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await open();
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'descending');
    await expect.poll(() => newest.requests.length).toBe(2);
    expect(oldest.requests).toHaveLength(1);
  });

  it('supports keyboard use and preserves the direction across status changes', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/runs/', runsResponse());
    fakeAdminEndpoint('GET', '/automations/first/runs/?order=created_at+asc', ascendingResponse());
    const completedAsc = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=completed&order=created_at+asc',
      filteredRunsResponse('completed', 'Oldest completed member'),
    );
    const exitedAsc = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=exited_early&order=created_at+asc',
      filteredRunsResponse('exited_early', 'Oldest exited member'),
    );
    const completedDesc = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=completed',
      filteredRunsResponse('completed', 'Newest completed member'),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect(runsRegion().getByRole('row')).toHaveCount(11);
    statusCard('Exited early').element().focus();
    await userEvent.tab();
    await expect.element(sortButton()).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'ascending');
    await userEvent.keyboard(' ');
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'descending');
    await userEvent.keyboard('{Enter}');
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'ascending');
    await statusCard('Completed').click();
    await expect.element(runsRegion()).toHaveTextContent('Oldest completed member');
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'ascending');
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'true');
    await statusCard('Exited early').click();
    await expect.element(runsRegion()).toHaveTextContent('Oldest exited member');
    await statusCard('Exited early').click();
    await statusCard('Completed').click();
    await sortButton().click();
    await expect.element(runsRegion()).toHaveTextContent('Newest completed member');
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'descending');
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'true');
    expect(completedAsc.requests).toHaveLength(2);
    expect(exitedAsc.requests).toHaveLength(1);
    expect(completedDesc.requests).toHaveLength(1);
  });

  it('discards a late response after switching direction again', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/runs/', runsResponse());
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const slow = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?order=created_at+asc',
      async () => {
        await pending;
        const late = ascendingResponse();
        late.automation_runs[0].member = { id: 'late', name: 'Late member', email: 'l@x.com' };
        return late;
      },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect(runsRegion().getByRole('row')).toHaveCount(11);
    await sortButton().click();
    await expect.poll(() => slow.requests.length).toBe(1);
    await expect
      .element(runsRegion().getByRole('status'))
      .toHaveTextContent('Loading automation runs');
    await sortButton().click();
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(2);
    finish();
    await settleRequests();
    await expect.element(runsRegion()).not.toHaveTextContent('Late member');
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'descending');
  });

  it('keeps a sorted request error until retried without losing the direction', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/runs/', runsResponse());
    const failed = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?order=created_at+asc',
      {},
      { status: 500 },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect(runsRegion().getByRole('row')).toHaveCount(11);
    await sortButton().click();
    await expect
      .element(runsRegion().getByRole('alert'))
      .toHaveTextContent('Could not load automation runs.');
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'ascending');
    await expect(runsRegion().getByRole('row')).toHaveCount(1);
    await close();
    await open();
    await expect.element(runsRegion().getByRole('alert')).toBeVisible();
    expect(failed.requests).toHaveLength(1);
    const recovered = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?order=created_at+asc',
      ascendingResponse(),
    );
    await runsRegion().getByRole('button', { name: 'Retry' }).click();
    await expect(runsRegion().getByRole('row')).toHaveCount(11);
    await expect
      .poll(enteredTimes)
      .toEqual(ascendingResponse().automation_runs.map((run) => run.created_at));
    expect(recovered.requests).toHaveLength(1);
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'ascending');
  });

  it('shows sorting as unavailable when an older Core ignores the direction', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/runs/', runsResponse());
    fakeAdminEndpoint('GET', '/automations/first/runs/?order=created_at+asc', runsResponse());
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect(runsRegion().getByRole('row')).toHaveCount(11);
    await sortButton().click();
    await expect
      .element(runsRegion().getByRole('status'))
      .toHaveTextContent('Sorting is unavailable on this version of Ghost.');
    await expect(runsRegion().getByRole('row')).toHaveCount(1);
    await expect(runsRegion().getByRole('button', { name: 'Retry' })).toHaveCount(0);
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'ascending');
    await sortButton().click();
    await expect(runsRegion().getByRole('row')).toHaveCount(11);
    await expect.element(enteredHeader()).toHaveAttribute('aria-sort', 'descending');
  });
});

describe('Automation run pagination', () => {
  const pageResponse = (pageNumber: number, nextCursor: string | null, count = 50) => ({
    automation_runs: Array.from({ length: count }, (_, i) => ({
      id: `page-${pageNumber}-run-${i}`,
      failed: false,
      created_at: new Date(Date.UTC(2026, 7, 28 - pageNumber, 12, 59 - i)).toISOString(),
      status: 'completed' as const,
      member: {
        id: `page-${pageNumber}-member-${i}`,
        name: `Page ${pageNumber} member ${i}`,
        email: `page-${pageNumber}-member-${i}@example.com`,
      },
    })),
    meta: { pagination: { limit: 50, next_cursor: nextCursor } },
  });
  const ascendingPage = (pageNumber: number, nextCursor: string | null) => {
    const body = pageResponse(pageNumber, nextCursor);
    body.automation_runs.reverse();
    return body;
  };
  const row = (name: string) => runsRegion().getByText(name, { exact: true });
  const renderedRows = () => runsRegion().element().querySelectorAll('tbody tr[data-index]').length;
  const scrollRoot = () =>
    document.querySelector('[aria-label="Performance details"]') as HTMLElement;
  // Pages arriving grow the list under the current position; keep scrolling until the height settles.
  const scrollToEnd = async () => {
    let previousHeight = -1;
    await expect
      .poll(async () => {
        const root = scrollRoot();
        root.scrollTop = root.scrollHeight;
        await settleRequests();
        const settled = root.scrollHeight === previousHeight;
        previousHeight = root.scrollHeight;
        return settled;
      })
      .toBe(true);
  };

  it('does not request a second page until the list is scrolled', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/runs/', pageResponse(1, 'c1'));
    const second = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?cursor=c1',
      pageResponse(2, null),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(row('Page 1 member 0')).toBeVisible();
    await settleRequests();
    expect(second.requests).toHaveLength(0);
    await scrollToEnd();
    await expect.element(row('Page 2 member 49')).toBeVisible();
    expect(second.requests).toHaveLength(1);
  });

  it('loads every page on the way to the end, renders only a window of rows, and leaves counts and chart alone', async () => {
    prepareStatuses();
    const summary = fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/',
      statusResponse('first', {
        in_progress_run_count: 100,
        completed_run_count: 20,
        exited_early_run_count: 4,
      }),
    );
    const chart = fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, ({ url }) =>
      rangeResponse(url),
    );
    const first = fakeAdminEndpoint('GET', '/automations/first/runs/', pageResponse(1, 'c1'));
    const second = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?cursor=c1',
      pageResponse(2, 'c2'),
    );
    const third = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?cursor=c2',
      pageResponse(3, null, 24),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(row('Page 1 member 0')).toBeVisible();
    expect(scrollRoot().scrollHeight).toBeLessThan(60 * 72);
    await scrollToEnd();
    await expect.element(row('Page 3 member 23')).toBeVisible();
    expect(renderedRows()).toBeLessThan(40);
    await expect(runsRegion().getByRole('status')).toHaveCount(0);
    expect(first.requests).toHaveLength(1);
    expect(second.requests).toHaveLength(1);
    expect(third.requests).toHaveLength(1);
    expect(summary.requests).toHaveLength(1);
    expect(chart.requests).toHaveLength(1);
    await close();
    await open();
    window.dispatchEvent(new Event('focus'));
    await settleRequests();
    await expect.element(row('Page 3 member 23')).toBeVisible();
    expect(first.requests).toHaveLength(1);
  });

  it('bounds a scrollbar jump to one additional page even with 200,000 total runs', async () => {
    prepareStatuses();
    fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/',
      statusResponse('first', {
        completed_run_count: 200000,
        in_progress_run_count: 0,
        exited_early_run_count: 0,
      }),
    );
    fakeAdminEndpoint('GET', '/automations/first/runs/', pageResponse(1, 'c1'));
    const second = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?cursor=c1',
      pageResponse(2, 'c2'),
    );
    const third = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?cursor=c2',
      pageResponse(3, 'c3'),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(row('Page 1 member 0')).toBeVisible();
    expect(scrollRoot().scrollHeight).toBeLessThan(60 * 72);
    scrollRoot().scrollTop = scrollRoot().scrollHeight;
    await expect.element(row('Page 2 member 0')).toBeVisible();
    await settleRequests();
    expect(second.requests).toHaveLength(1);
    expect(third.requests).toHaveLength(0);
    expect(scrollRoot().scrollHeight).toBeLessThan(110 * 72);
  });

  it('still pages when the status counts request failed', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/status-stats/', {}, { status: 500 });
    fakeAdminEndpoint('GET', '/automations/first/runs/', pageResponse(1, 'c1'));
    const second = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?cursor=c1',
      pageResponse(2, null, 20),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(statuses().getByRole('alert'))
      .toHaveTextContent('Could not load status counts.');
    await expect.element(row('Page 1 member 0')).toBeVisible();
    await scrollToEnd();
    await expect.element(row('Page 2 member 19')).toBeVisible();
    expect(second.requests).toHaveLength(1);
  });

  it('keeps loaded rows when a later page fails and retries only that page', async () => {
    prepareStatuses();
    const first = fakeAdminEndpoint('GET', '/automations/first/runs/', pageResponse(1, 'c1'));
    const failed = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?cursor=c1',
      {},
      { status: 500 },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(row('Page 1 member 0')).toBeVisible();
    await scrollToEnd();
    await expect
      .element(runsRegion().getByRole('alert'))
      .toHaveTextContent('Could not load more runs.');
    await expect.element(row('Page 1 member 49')).toBeVisible();
    await expect.element(runsRegion()).not.toHaveTextContent('Could not load automation runs.');
    await scrollToEnd();
    expect(failed.requests).toHaveLength(1);
    const recovered = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?cursor=c1',
      pageResponse(2, null, 20),
    );
    await runsRegion().getByRole('button', { name: 'Retry' }).click();
    await scrollToEnd();
    await expect.element(row('Page 2 member 19')).toBeVisible();
    await expect(runsRegion().getByRole('alert')).toHaveCount(0);
    expect(recovered.requests).toHaveLength(1);
    expect(first.requests).toHaveLength(1);
  });

  it('starts from the first result with compact controls on status and direction changes and scopes cursors to them', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/runs/', pageResponse(1, 'c1'));
    fakeAdminEndpoint('GET', '/automations/first/runs/?cursor=c1', pageResponse(2, null));
    const completed = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=completed',
      pageResponse(3, 'sc1'),
    );
    const completedMore = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=completed&cursor=sc1',
      pageResponse(4, null),
    );
    // Oldest first: the later page holds newer runs, and rows ascend within each page.
    const ascending = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=completed&order=created_at+asc',
      ascendingPage(6, 'ac1'),
    );
    const ascendingMore = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?status=completed&order=created_at+asc&cursor=ac1',
      ascendingPage(5, null),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(row('Page 1 member 0')).toBeVisible();
    await scrollToEnd();
    await expect.element(row('Page 2 member 49')).toBeVisible();
    await statusCard('Completed').click();
    await expect.element(row('Page 3 member 0')).toBeVisible();
    await expect
      .poll(() =>
        Math.abs(
          runsRegion().element().getBoundingClientRect().top -
            scrollRoot().getBoundingClientRect().top,
        ),
      )
      .toBeLessThanOrEqual(1);
    await expect.element(runsRegion()).not.toHaveTextContent('Page 2 member');
    await scrollToEnd();
    await expect.element(row('Page 4 member 49')).toBeVisible();
    await runsRegion().getByRole('button', { name: 'Entered', exact: true }).click();
    await expect.element(row('Page 6 member 49')).toBeVisible();
    await expect
      .poll(() =>
        Math.abs(
          runsRegion().element().getBoundingClientRect().top -
            scrollRoot().getBoundingClientRect().top,
        ),
      )
      .toBeLessThanOrEqual(1);
    await scrollToEnd();
    await expect.element(row('Page 5 member 0')).toBeVisible();
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'true');
    expect(completed.requests).toHaveLength(1);
    expect(completedMore.requests).toHaveLength(1);
    expect(ascending.requests).toHaveLength(1);
    expect(ascendingMore.requests).toHaveLength(1);
  });

  it('discards a page that arrives after the query changed', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/runs/', pageResponse(1, 'c1'));
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const slow = fakeAdminEndpoint('GET', '/automations/first/runs/?cursor=c1', async () => {
      await pending;
      return pageResponse(2, null);
    });
    fakeAdminEndpoint('GET', '/automations/first/runs/?status=completed', pageResponse(3, null));
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(row('Page 1 member 0')).toBeVisible();
    scrollRoot().scrollTop = scrollRoot().scrollHeight;
    await expect.poll(() => slow.requests.length).toBe(1);
    await expect
      .element(runsRegion().getByRole('status'))
      .toHaveTextContent('Loading more entries');
    await statusCard('Completed').click();
    await expect.element(row('Page 3 member 0')).toBeVisible();
    finish();
    await settleRequests();
    await scrollToEnd();
    await expect.element(row('Page 3 member 49')).toBeVisible();
    await expect.element(runsRegion()).not.toHaveTextContent('Page 2 member');
    await expect(runsRegion().getByRole('alert')).toHaveCount(0);
  });

  it('shows a run once when a later live page repeats it', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', '/automations/first/runs/', pageResponse(1, 'c1'));
    const repeated = pageResponse(2, null, 5);
    repeated.automation_runs[0] = {
      ...pageResponse(1, null).automation_runs[49],
      member: { id: 'changed', name: 'Changed member', email: 'changed@example.com' },
    };
    fakeAdminEndpoint('GET', '/automations/first/runs/?cursor=c1', repeated);
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(row('Page 1 member 0')).toBeVisible();
    await scrollToEnd();
    await expect.element(row('Page 2 member 4')).toBeVisible();
    await expect(row('Page 1 member 49')).toHaveCount(1);
    await expect(row('Changed member')).toHaveCount(0);
  });

  it('starts from the first page after navigating away and back', async () => {
    prepareStatuses();
    prepareStatuses('second');
    const first = fakeAdminEndpoint('GET', '/automations/first/runs/', pageResponse(1, 'c1'));
    const more = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?cursor=c1',
      pageResponse(2, null),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(row('Page 1 member 0')).toBeVisible();
    await scrollToEnd();
    await expect.element(row('Page 2 member 49')).toBeVisible();
    window.location.hash = '#/automations/second';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    window.location.hash = '#/automations/first';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await open();
    await expect.element(row('Page 1 member 0')).toBeVisible();
    await settleRequests();
    expect(first.requests).toHaveLength(2);
    expect(more.requests).toHaveLength(1);
    await scrollToEnd();
    await expect.element(row('Page 2 member 49')).toBeVisible();
    expect(more.requests).toHaveLength(2);
  });

  it('offers no further pages on an older Core without pagination metadata', async () => {
    prepareStatuses();
    const first = fakeAdminEndpoint('GET', '/automations/first/runs/', runsResponse());
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect(runsRegion().getByRole('row')).toHaveCount(11);
    await scrollToEnd();
    await expect(runsRegion().getByRole('status')).toHaveCount(0);
    await expect(runsRegion().getByRole('alert')).toHaveCount(0);
    expect(first.requests).toHaveLength(1);
  });
});
