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
  fakeAdminEndpoint('GET', `/automations/${id}/status-stats/`, statusResponse(id));
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
const statusCard = (name: string) => statuses().getByRole('group', { name, exact: true });
const prepareStatuses = (id = 'first') => {
  read(id);
  fakeAdminEndpoint('GET', new RegExp(`^/automations/${id}/entry-stats/\\?`), response(id));
};

describe('Automation status counts', () => {
  it('fetches only when opened and renders three display-only status cards', async () => {
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
    await expect.element(statuses().getByRole('button')).not.toBeInTheDocument();
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
      panel.querySelector(`[role="group"][aria-label="${name}"]`)!,
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
      const expectedWidth = Math.min(480, panel.parentElement!.getBoundingClientRect().width - 60);
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
      await expect(statuses().getByRole('group')).toHaveCount(3);
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
    await expect.element(statuses().getByRole('button')).not.toBeInTheDocument();
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

  it('filters only entries across date presets and clearing, without refetching status counts', async () => {
    read('first');
    const statusRequests = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/status-stats\//,
      statusResponse('first', {
        in_progress_run_count: 118,
        completed_run_count: 1260,
        exited_early_run_count: 42,
      }),
    );
    const expectUnfilteredStatuses = async () => {
      await expect.element(statusCard('In progress')).toHaveTextContent('118');
      await expect.element(statusCard('Completed')).toHaveTextContent('1,260');
      await expect.element(statusCard('Exited early')).toHaveTextContent('42');
      await settleRequests();
      expect(statusRequests.requests).toHaveLength(1);
      expect(new URL(statusRequests.lastRequest!.url).search).toBe('');
    };
    const requests = fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, ({ url }) =>
      rangeResponse(url),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(entries().getByText('1,432', { exact: true })).toBeVisible();
    await expectUnfilteredStatuses();
    expect(new URL(requests.requests[0].url).searchParams.has('date_from')).toBe(false);
    await expect
      .element(page.getByRole('button', { name: 'Clear date filter' }))
      .not.toBeInTheDocument();
    for (const days of [7, 30, 90]) {
      await selectRange(`Last ${days} days`);
      await expect.element(entries()).toHaveTextContent(String(days * 3));
      const query = new URL(requests.lastRequest!.url).searchParams;
      expect(
        (Date.parse(query.get('date_to')!) - Date.parse(query.get('date_from')!)) / 86400000 + 1,
      ).toBe(days);
      expect(query.get('timezone')).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
      await expect
        .element(entries().getByRole('figure'))
        .toHaveTextContent(query.get('date_from')!);
      await expect
        .element(page.getByRole('button', { name: 'Clear date filter' }))
        .toHaveTextContent(`Last ${days} days`);
      await expectUnfilteredStatuses();
    }
    const count = requests.requests.length;
    await close();
    await open();
    await expect.element(entries().getByText('270', { exact: true })).toBeVisible();
    expect(requests.requests.length).toBe(count);
    await expectUnfilteredStatuses();
    await page.getByRole('button', { name: 'Clear date filter' }).click();
    await expect.element(entries().getByText('1,432', { exact: true })).toBeVisible();
    await expectUnfilteredStatuses();
    await expect
      .element(page.getByRole('button', { name: 'Clear date filter' }))
      .not.toBeInTheDocument();
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
