import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import { flags, response, read as readAutomation } from './run-list.test-utils';

const read = (id: string) => {
  fakeAdminEndpoint('GET', new RegExp(`/automations/${id}/runs/\\?`), {
    meta: { pagination: { limit: 50, next_cursor: null } },
    automation_runs: [],
  });
  return readAutomation(id);
};
const statsUrl = (id: string) =>
  `/automations/${id}/performance-stats/?${new URLSearchParams({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}`;
const prepare = (id = 'first') => {
  read(id);
  return fakeAdminEndpoint('GET', statsUrl(id), response(id));
};
const entries = () => page.getByRole('region', { name: 'Total entries' });
const statuses = () => page.getByRole('region', { name: 'Automation status counts' });
const statusCard = (name: string) => statuses().getByRole('button', { name, exact: true });
const open = () => page.getByRole('button', { name: 'Show performance' }).click();
const close = () => page.getByRole('button', { name: 'Hide performance' }).click();

describe('Performance sidebar data and errors', () => {
  it('fetches only when opened and renders three status cards', async () => {
    const request = prepare();
    await renderAdminApp('/automations/first', flags);
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    expect(request.requests).toHaveLength(0);
    await open();
    await expect.element(statusCard('In progress')).toHaveTextContent('118');
    await expect.element(statusCard('Completed')).toHaveTextContent('1,260');
    await expect.element(statusCard('Exited early')).toHaveTextContent('54');
    await expect
      .element(statuses().getByRole('status'))
      .toHaveTextContent('Statistics loaded. 118 in progress, 1,260 completed, 54 exited early.');
    await expect(statuses().getByRole('button')).toHaveCount(3);
    await expect.element(entries()).toHaveTextContent('1,432');
    await expect
      .poll(() => document.querySelector('aside')?.getBoundingClientRect().width)
      .toBe(480);
    await expect.element(entries()).toHaveTextContent('22 Jun');
    await expect.element(entries()).toHaveTextContent('23 Jun');
    expect(request.requests).toHaveLength(1);
    expect(new URL(request.requests[0].url).searchParams.get('timezone')).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    const content = statuses().element();
    await close();
    expect(content.isConnected).toBe(true);
    expect(content.closest('aside')?.inert).toBe(true);
    expect(content.closest('aside')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows loading until successful zero counts arrive', async () => {
    read('first');
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    fakeAdminEndpoint('GET', statsUrl('first'), async () => {
      await pending;
      return response('first', {
        inProgress: 0,
        completed: 0,
        exitedEarly: 0,
      });
    });
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(statuses().getByRole('status'))
      .toHaveTextContent('Loading automation statuses');
    const statusAnnouncement = statuses().getByRole('status').element();
    const entryAnnouncement = entries().getByRole('status').element();
    expect(statusAnnouncement).toHaveAttribute('aria-atomic', 'true');
    expect(entryAnnouncement).toHaveAttribute('aria-atomic', 'true');
    await expect.element(statusCard('Completed')).not.toHaveTextContent('0');
    await expect.element(entries().getByRole('status')).toHaveTextContent('Loading total entries');
    finish();
    await expect.element(entries().getByRole('figure')).toBeVisible();
    await expect.element(entries()).not.toHaveTextContent('No entries');
    for (const name of ['In progress', 'Completed', 'Exited early']) {
      await expect.element(statusCard(name)).toHaveTextContent('0');
    }
    await expect
      .element(statuses().getByRole('status'))
      .toHaveTextContent('Statistics loaded. 0 in progress, 0 completed, 0 exited early.');
    await expect
      .element(entries().getByRole('status'))
      .toHaveTextContent('Total entries loaded: 0.');
    expect(statuses().getByRole('status').element()).toBe(statusAnnouncement);
    expect(entries().getByRole('status').element()).toBe(entryAnnouncement);
  });

  it.each([404, 500])(
    'shows one panel error and retries both chart and cards together (%s)',
    async (status) => {
      read('first');
      const failedRequest = fakeAdminEndpoint(
        'GET',
        statsUrl('first'),
        { errors: [{ message: 'Failed' }] },
        { status },
      );
      await renderAdminApp('/automations/first', flags);
      await open();
      await expect
        .element(page.getByRole('alert'))
        .toHaveTextContent('Could not load performance data');
      await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(1);
      await expect.element(entries()).not.toBeInTheDocument();
      await expect.element(statuses()).not.toBeInTheDocument();
      await close();
      await open();
      await expect.element(page.getByRole('alert')).toBeVisible();
      expect(failedRequest.requests).toHaveLength(1);
      const retry = fakeAdminEndpoint('GET', statsUrl('first'), response('first'));
      await page.getByRole('button', { name: 'Retry' }).click();
      await expect.element(statusCard('Completed')).toHaveTextContent('1,260');
      await expect.element(entries()).toHaveTextContent('1,432');
      expect(retry.requests).toHaveLength(1);
      await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
    },
  );

  it.each([
    { name: 'malformed', body: {} },
    { name: 'wrong automation', body: response('other') },
  ])('rejects a $name response for both the chart and cards', async ({ body }) => {
    read('first');
    fakeAdminEndpoint('GET', statsUrl('first'), body);
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Could not load performance data');
    await expect.element(entries()).not.toBeInTheDocument();
    await expect.element(statuses()).not.toBeInTheDocument();
  });
});

describe('Performance sidebar request lifecycle', () => {
  it('shares one request across the chart and cards, reopening, focus, and reconnect', async () => {
    const request = prepare();
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('1,260');
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
    expect(request.requests).toHaveLength(1);
  });

  it('keeps requests scoped through navigation and late responses', async () => {
    read('first');
    read('second');
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const first = fakeAdminEndpoint('GET', statsUrl('first'), async () => {
      await pending;
      return response('first');
    });
    fakeAdminEndpoint(
      'GET',
      statsUrl('second'),
      response('second', { inProgress: 118, completed: 2500, exitedEarly: 54 }),
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
    await expect.element(entries()).toHaveTextContent('2,672');
    const revisit = fakeAdminEndpoint(
      'GET',
      statsUrl('first'),
      response('first', { inProgress: 118, completed: 1600, exitedEarly: 54 }),
    );
    window.location.hash = '#/automations/first';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('1,600');
    await expect.element(entries()).toHaveTextContent('1,772');
    await expect.poll(() => revisit.requests.length).toBe(1);
  });

  it.each(['automationRunAnalytics', 'automationsTinybirdSync'])(
    'hides performance and does not fetch stats with %s disabled',
    async (flag) => {
      const request = prepare();
      await renderAdminApp('/automations/first', { labs: { ...flags.labs, [flag]: false } });
      await expect
        .element(
          page.getByRole(flag === 'automationRunAnalytics' ? 'button' : 'article', {
            name: 'Wait: 1 day',
          }),
        )
        .toBeVisible();
      expect(request.requests).toHaveLength(0);
      await expect
        .element(page.getByRole('button', { name: 'Show performance' }))
        .not.toBeInTheDocument();
      await expect.element(statuses()).not.toBeInTheDocument();
    },
  );
});

describe('Performance sidebar layout', () => {
  it('keeps the chart and cards at a stable width throughout reopening', async () => {
    prepare();
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('1,260');
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

  it('fits the sidebar to a narrow canvas without overflowing the chart or cards', async () => {
    await page.viewport(400, 800);
    try {
      prepare();
      await renderAdminApp('/automations/first', flags);
      await open();
      await expect.element(statusCard('Completed')).toHaveTextContent('1,260');
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
    prepare();
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('1,260');
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
      document.documentElement.style.fontSize = '';
    }
  });

  it('keeps chart and card dimensions stable across the shared loading state', async () => {
    read('first');
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const request = fakeAdminEndpoint('GET', statsUrl('first'), async () => {
      await pending;
      return response('first');
    });
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(entries().getByRole('status')).toHaveTextContent('Loading total entries');
    await expect
      .poll(() => document.querySelector('aside')?.getBoundingClientRect().width)
      .toBe(480);
    const chartHeight = entries().element().getBoundingClientRect().height;
    const cardHeight = statusCard('Completed').element().getBoundingClientRect().height;
    const cardTop = statusCard('Completed').element().getBoundingClientRect().top;
    await close();
    finish();
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('1,260');
    await expect.element(entries()).toHaveTextContent('1,432');
    expect(entries().element().getBoundingClientRect().height).toBeCloseTo(chartHeight, 0);
    expect(statusCard('Completed').element().getBoundingClientRect().height).toBeCloseTo(
      cardHeight,
      0,
    );
    expect(statusCard('Completed').element().getBoundingClientRect().top).toBeCloseTo(cardTop, 0);
    expect(request.requests).toHaveLength(1);
  });
});
