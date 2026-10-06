import { describe, expect, it } from 'vitest';
import { automationsScreen } from './automations.screen';
import { page } from 'vitest/browser';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { detail } from './run-history.test-utils';
import {
  automation,
  fakeAutomations,
  fakeAdminEndpoint,
  renderAdminApp,
} from '@test-utils/acceptance';
import {
  openAutomationSidebar,
  flags,
  response,
  read as readAutomation,
} from './run-list.test-utils';

const read = (id: string, status: 'active' | 'inactive' = 'active') => {
  fakeAdminEndpoint('GET', new RegExp(`/automations/${id}/runs/\\?`), {
    meta: { pagination: { limit: 50, next_cursor: null } },
    automation_runs: [],
  });
  return readAutomation(id, status);
};
const statsUrl = (id: string) =>
  `/automations/${id}/performance-stats/?${new URLSearchParams({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}`;
const prepare = (id = 'first', status: 'active' | 'inactive' = 'active') => {
  read(id, status);
  return fakeAdminEndpoint('GET', statsUrl(id), response(id));
};
const entries = () => page.getByRole('region', { name: 'Total runs' });
const statuses = () => page.getByRole('region', { name: 'Automation status counts' });
const statusCard = (name: string) => statuses().getByRole('button', { name, exact: true });
const open = openAutomationSidebar;
const close = () => page.getByRole('button', { name: 'Hide automation sidebar' }).click();

describe('Performance without Tinybird configuration', () => {
  it.each([
    { width: 1280, fromList: false, status: 'active' as const },
    { width: 400, fromList: false, status: 'active' as const },
    { width: 1280, fromList: true, status: 'inactive' as const },
  ])(
    'keeps editing usable without analytics ($width, $fromList, $status)',
    async ({ width, fromList, status }) => {
      await page.viewport(width, 800);
      try {
        const data = { ...detail('first'), status };
        fakeAdminEndpoint('GET', '/automations/first/', { automations: [data] });
        const stats = fakeAdminEndpoint('GET', statsUrl('first'), response('first'));
        const runs = fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?/, {
          meta: { pagination: { limit: 50, next_cursor: null } },
          automation_runs: [],
        });
        const save = fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => ({
          automations: [
            { ...data, ...(body as { automations: Partial<AutomationDetail>[] }).automations[0] },
          ],
        }));
        if (fromList) {
          fakeAutomations([automation({ id: 'first', name: data.name, status })]);
        }
        // Default boot config omits stats, as an unconfigured or older Core does.
        await renderAdminApp(fromList ? '/automations' : '/automations/first', {
          labs: flags.labs,
        });
        if (fromList) {
          await page.getByRole('link', { name: data.name, exact: true }).click();
        }
        const canvas = page.getByRole('region', { name: 'Editing canvas' });
        await expect.element(canvas).toBeVisible();
        await expect.element(page.getByRole('textbox', { name: 'Wait for' })).toBeVisible();
        await expect
          .element(page.getByRole('button', { name: 'Show automation sidebar' }))
          .toBeVisible();
        await expect
          .element(page.getByRole('complementary', { name: 'Performance' }))
          .not.toBeInTheDocument();
        await expect
          .element(page.getByText('Could not load performance data'))
          .not.toBeInTheDocument();
        await expect
          .poll(() => canvas.element().getBoundingClientRect().width)
          .toBe(page.getByTestId('automation-canvas').element().getBoundingClientRect().width);
        await page.getByRole('button', { name: 'Show automation sidebar' }).click();
        await expect.element(page.getByRole('tab', { name: 'Settings' })).toBeVisible();
        await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Updated flow');
        await page.getByRole('button', { name: 'Hide automation sidebar' }).click();
        await page.getByRole('textbox', { name: 'Wait for' }).fill('2');
        const saveLabel = status === 'active' ? 'Publish changes' : 'Save';
        await page.getByRole('button', { name: saveLabel, exact: true }).click();
        if (status === 'active') {
          await page
            .getByRole('alertdialog')
            .getByRole('button', { name: saveLabel, exact: true })
            .click();
        }
        await expect.poll(() => save.requests.length).toBe(1);
        expect(
          (save.requests[0].body as { automations: AutomationDetail[] }).automations[0].actions[0]
            .data,
        ).toEqual({ wait_hours: 48 });
        expect(stats.requests).toHaveLength(0);
        expect(runs.requests).toHaveLength(0);
      } finally {
        await page.viewport(1280, 800);
      }
    },
  );
});

describe('Automation sidebar defaults', () => {
  it('opens on an active flow deep link after loading and respects close/reopen through edits', async () => {
    prepare();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    fakeAdminEndpoint('GET', '/automations/first/', async () => {
      await pending;
      return { automations: [{ ...detail('first'), status: 'active' }] };
    });
    try {
      await renderAdminApp('/automations/first', flags);
      await expect.element(page.getByTestId('automation-canvas-loading')).toBeVisible();
    } finally {
      finish();
    }
    await expect.element(statusCard('Completed')).toHaveTextContent('1,260');
    await expect.element(automationsScreen.hideAutomationSidebarButton()).toBeVisible();
    const canvas = page.getByRole('region', { name: 'Editing canvas' });
    const card = page.getByRole('article', { name: 'Wait: 1 day' });
    await expect
      .poll(() => {
        const bounds = canvas.element().getBoundingClientRect();
        const step = card.element().getBoundingClientRect();
        return Math.abs(step.x + step.width / 2 - (bounds.x + bounds.width / 2));
      })
      .toBeLessThan(2);
    await close();
    await page.getByRole('textbox', { name: 'Wait for' }).fill('2');
    await expect.element(automationsScreen.showAutomationSidebarButton()).toBeVisible();
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('1,260');
  });

  it('resets defaults between active and draft flows and when revisiting a closed flow', async () => {
    prepare('first');
    prepare('second');
    fakeAdminEndpoint(
      'GET',
      statsUrl('second'),
      response('second', { inProgress: 118, completed: 2500, exitedEarly: 54 }),
    );
    const draftRequests = prepare('draft', 'inactive');
    await renderAdminApp('/automations/first', flags);
    await expect.element(statusCard('Completed')).toBeVisible();
    await close();
    window.location.hash = '#/automations/second';
    await expect.element(statusCard('Completed')).toHaveTextContent('2,500');
    window.location.hash = '#/automations/draft';
    await expect.element(automationsScreen.showAutomationSidebarButton()).toBeVisible();
    expect(draftRequests.requests).toHaveLength(0);
    window.location.hash = '#/automations/first';
    await expect.element(statusCard('Completed')).toBeVisible();
    await expect.element(automationsScreen.hideAutomationSidebarButton()).toBeVisible();
  });

  it.each([false, true])(
    'uses the published default while preserving an explicit close (%s)',
    async (explicitClose) => {
      prepare('first', 'inactive');
      const data = detail('first');
      fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => ({
        automations: [
          { ...data, ...(body as { automations: Partial<AutomationDetail>[] }).automations[0] },
        ],
      }));
      await renderAdminApp('/automations/first', flags);
      await expect.element(automationsScreen.showAutomationSidebarButton()).toBeVisible();
      if (explicitClose) {
        await open();
        await close();
      }
      await page.getByRole('button', { name: 'Publish', exact: true }).click();
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Publish', exact: true })
        .click();
      await expect
        .element(page.getByRole('button', { name: 'Turn off', exact: true }))
        .toBeVisible();
      await expect
        .element(
          explicitClose
            ? automationsScreen.showAutomationSidebarButton()
            : automationsScreen.hideAutomationSidebarButton(),
        )
        .toBeVisible();
      await page.getByRole('button', { name: 'Turn off', exact: true }).click();
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Turn off', exact: true })
        .click();
      await expect
        .element(page.getByRole('button', { name: 'Publish', exact: true }))
        .toBeVisible();
      await expect.element(automationsScreen.showAutomationSidebarButton()).toBeVisible();
    },
  );
});

describe('Automation sidebar data and errors', () => {
  it('remains closed by default for draft automations and fetches only when opened', async () => {
    const request = prepare('first', 'inactive');
    await renderAdminApp('/automations/first', flags);
    await expect
      .element(page.getByRole('button', { name: 'Show automation sidebar' }))
      .toBeVisible();
    expect(request.requests).toHaveLength(0);
    await open();
    await expect.element(statusCard('In progress')).toHaveTextContent('118');
    await expect.element(statusCard('Completed')).toHaveTextContent('1,260');
    await expect.element(statusCard('Stopped')).toHaveTextContent('54');
    await expect
      .element(statuses().getByRole('status'))
      .toHaveTextContent('Statistics loaded. 118 in progress, 1,260 completed, 54 stopped.');
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
    await expect.element(entries().getByRole('status')).toHaveTextContent('Loading total runs');
    finish();
    await expect.element(entries().getByRole('figure')).toBeVisible();
    await expect.element(entries()).not.toHaveTextContent('No entries');
    for (const name of ['In progress', 'Completed', 'Stopped']) {
      await expect.element(statusCard(name)).toHaveTextContent('0');
    }
    await expect
      .element(statuses().getByRole('status'))
      .toHaveTextContent('Statistics loaded. 0 in progress, 0 completed, 0 stopped.');
    await expect.element(entries().getByRole('status')).toHaveTextContent('Total runs loaded: 0.');
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

describe('Automation sidebar request lifecycle', () => {
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
    await expect
      .element(page.getByRole('button', { name: 'Hide automation sidebar' }))
      .toBeVisible();
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
    await expect
      .element(page.getByRole('button', { name: 'Hide automation sidebar' }))
      .toBeVisible();
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('1,600');
    await expect.element(entries()).toHaveTextContent('1,772');
    await expect.poll(() => revisit.requests.length).toBe(1);
  });

  it.each(['automationRunAnalytics', 'automationsTinybirdSync'])(
    'hides performance and does not fetch stats with %s disabled',
    async (flag) => {
      const request = prepare();
      await renderAdminApp('/automations/first', {
        ...flags,
        labs: { ...flags.labs, [flag]: false },
      });
      await expect
        .element(
          page.getByRole(flag === 'automationRunAnalytics' ? 'button' : 'article', {
            name: 'Wait: 1 day',
          }),
        )
        .toBeVisible();
      expect(request.requests).toHaveLength(0);
      await expect.element(page.getByRole('tab', { name: 'Performance' })).not.toBeInTheDocument();
      await expect
        .element(page.getByRole('button', { name: 'Show automation sidebar' }))
        .toBeVisible();
      await expect.element(statuses()).not.toBeInTheDocument();
    },
  );
});

describe('Automation sidebar layout', () => {
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
    const cards = ['In progress', 'Completed', 'Stopped'].map((name) =>
      panel.querySelector(`button[aria-label="${name}"]`)!,
    );
    const expectedCardWidths = cards.map((card) => card.getBoundingClientRect().width);
    // Pause the real CSS transition and seek through it, independent of frame timing.
    const originalDuration = panel.style.transitionDuration;
    panel.style.transitionDuration = '100s';
    let transition: Animation | undefined;
    try {
      // This case inspects the opening transition before it settles.
      await automationsScreen.showAutomationSidebarButton().click();
      await expect
        .poll(() => {
          transition = panel
            .getAnimations()
            .find(
              (animation) =>
                animation instanceof CSSTransition && animation.transitionProperty === 'width',
            );
          return transition;
        })
        .toBeDefined();
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
      for (const name of ['In progress', 'Completed', 'Stopped']) {
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
      for (const name of ['In progress', 'Completed', 'Stopped']) {
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
    await expect.element(entries().getByRole('status')).toHaveTextContent('Loading total runs');
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
