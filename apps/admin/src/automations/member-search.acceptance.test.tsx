import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import { settleRequests } from '@test-utils/acceptance/worker';
import {
  flags,
  open,
  setup,
  run,
  respond,
  history,
  select,
  canvas,
} from './run-history.test-utils';

const list = () => page.getByRole('region', { name: 'Automation runs', exact: true });
const cards = () => page.getByRole('region', { name: 'Automation status counts' });
const input = () => page.getByRole('textbox', { name: 'Search members' });
const searchMeta = (query: string) => ({ version: 1, query, matching: 'contains' });
const result = (
  query: string,
  names = ['Anna'],
  cursor: string | null = null,
  state = cursor ? 'more' : 'exhausted',
) => ({
  automation_runs: names.map((name, i) => ({ ...run(String(999 - i).padStart(4, '0'), name) })),
  meta: { search: searchMeta(query), pagination: { limit: 50, next_cursor: cursor, state } },
});
const counts = (query: string, cursor: string | null = null, total = 123) => ({
  automation_status_stats: cursor
    ? []
    : [
        {
          automation_id: 'first',
          in_progress_run_count: 0,
          completed_run_count: total,
          exited_early_run_count: 0,
          unclassified_run_count: 0,
        },
      ],
  meta: {
    search: searchMeta(query),
    pagination: { next_cursor: cursor, state: cursor ? 'scanning' : 'exhausted' },
  },
});
const searchApis = (query = 'Anna') => ({
  list: fakeAdminEndpoint('GET', /^\/automations\/first\/runs\/\?/, result(query)),
  counts: fakeAdminEndpoint('GET', /^\/automations\/first\/status-stats\/\?/, counts(query)),
});
const start = async () => {
  await renderAdminApp('/automations/first', flags);
  await open();
  await page.getByRole('button', { name: 'Search members', exact: true }).click();
};
const scroll = () => document.querySelector('[aria-label="Performance details"]') as HTMLElement;

// Focus and screenshots must not scroll the clipped canvas horizontally.
const expectSidebarAtOrigin = async () => {
  await expect
    .poll(() => ({
      left: document.querySelector('aside')!.getBoundingClientRect().left,
      scrolling: [...document.querySelectorAll('*')]
        .filter((e) => e.scrollLeft)
        .map((e) => ({ tag: e.tagName, cls: e.className, scrollLeft: e.scrollLeft })),
    }))
    .toEqual({ left: 0, scrolling: [] });
};

describe('Performance member search', () => {
  it('opens with focus and the chart visible, hides it for input, clears and closes with deliberate focus', async () => {
    const base = setup();
    const api = searchApis();
    await start();
    await expect.element(input()).toHaveFocus();
    await expect.element(page.getByRole('region', { name: 'Total entries' })).toBeVisible();
    expect(api.list.requests).toHaveLength(0);
    await input().fill('  Anna  ');
    await expect
      .element(page.getByRole('region', { name: 'Total entries' }))
      .not.toBeInTheDocument();
    await expect.element(list()).toHaveTextContent('Anna');
    await expect.element(cards()).toHaveTextContent('123');
    expect(new URL(api.list.requests[0].url).searchParams.get('search')).toBe('Anna');
    await page.getByRole('button', { name: 'Clear member search' }).click();
    await expect.element(input()).toHaveFocus();
    await expect.element(page.getByRole('region', { name: 'Total entries' })).toBeVisible();
    await expect.element(list()).toHaveTextContent('Alex');
    await input().fill('Not committed');
    await userEvent.keyboard('{Escape}');
    await expect.element(input()).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Search members', exact: true }))
      .toHaveFocus();
    await settleRequests();
    expect(api.list.requests).toHaveLength(1);
    expect(base.list.requests).toHaveLength(2);
  });
  it('preserves status and Entered direction while counts remain independent of list interactions', async () => {
    setup();
    const api = searchApis();
    await start();
    await input().fill('Anna');
    await expect.element(list()).toHaveTextContent('Anna');
    await expect.element(cards()).toHaveTextContent('123');
    await cards().getByRole('button', { name: 'Completed', exact: true }).click();
    await list().getByRole('button', { name: 'Entered', exact: true }).click();
    await expect
      .poll(() => new URL(api.list.requests.at(-1)!.url).searchParams.get('order'))
      .toBe('created_at asc');
    expect(new URL(api.list.requests.at(-1)!.url).searchParams.get('status')).toBe('completed');
    expect(api.counts.requests).toHaveLength(1);
    fakeAdminEndpoint('GET', '/automations/first/runs/?status=completed&order=created_at+asc', {
      automation_runs: [run('a', 'Cleared')],
    });
    await page.getByRole('button', { name: 'Close member search' }).click();
    await expect.element(list()).toHaveTextContent('Cleared');
    await expect
      .element(cards().getByRole('button', { name: 'Completed', exact: true }))
      .toHaveAttribute('aria-pressed', 'true');
    await expect
      .element(list().getByRole('columnheader', { name: 'Entered' }))
      .toHaveAttribute('aria-sort', 'ascending');
  });
  it('discards stale list and count responses after typing, clearing and closing', async () => {
    setup();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const fresh = searchApis('New');
    const staleList = fakeAdminEndpoint('GET', '/automations/first/runs/?search=Old', async () => {
      await gate;
      return result('Old', ['Stale member']);
    });
    const staleCounts = fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/?search=Old',
      async () => {
        await gate;
        return counts('Old', null, 999);
      },
    );
    await start();
    await input().fill('Old');
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => staleList.requests.length).toBe(1);
    await expect.poll(() => staleCounts.requests.length).toBe(1);
    await input().fill('New');
    await userEvent.keyboard('{Enter}');
    await expect.element(list()).toHaveTextContent('Anna');
    await page.getByRole('button', { name: 'Close member search' }).click();
    release();
    await settleRequests();
    await expect.element(list()).toHaveTextContent('Alex');
    await expect.element(list()).not.toHaveTextContent('Stale member');
    await expect.element(cards()).not.toHaveTextContent('999');
    expect(fresh.list.requests.length).toBeGreaterThan(0);
  });
  it('recognizes an older backend that ignores search for list and counts', async () => {
    setup();
    fakeAdminEndpoint('GET', /^\/automations\/first\/runs\/\?/, {
      automation_runs: [run('a', 'Unfiltered')],
    });
    fakeAdminEndpoint('GET', /^\/automations\/first\/status-stats\/\?/, {
      automation_status_stats: [
        {
          automation_id: 'first',
          in_progress_run_count: 999,
          completed_run_count: 0,
          exited_early_run_count: 0,
          unclassified_run_count: 0,
        },
      ],
    });
    await start();
    await input().fill('Anna');
    await expect.element(list()).toHaveTextContent('Member search is unavailable');
    await expect.element(list()).not.toHaveTextContent('Unfiltered');
    await expect.element(cards()).toHaveTextContent('Status counts are unavailable');
    await expect.element(cards()).not.toHaveTextContent('999');
  });
  it('finishes count continuations without exposing partial totals or resetting the list', async () => {
    setup();
    const api = searchApis();
    fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/?search=Anna',
      counts('Anna', 'count-next'),
    );
    const more = fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/?search=Anna&cursor=count-next',
      counts('Anna'),
    );
    await start();
    await input().fill('Anna');
    await expect.element(cards()).toHaveTextContent('123');
    expect(more.requests).toHaveLength(1);
    expect(api.list.requests).toHaveLength(1);
  });
  it('retries a failed count page without replaying earlier pages or resetting the list', async () => {
    setup();
    const api = searchApis();
    const first = fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/?search=Anna',
      counts('Anna', 'next'),
    );
    const failed = fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/?search=Anna&cursor=next',
      { errors: [{ message: 'Unavailable', type: 'InternalServerError' }] },
      { status: 500 },
    );
    await start();
    await input().fill('Anna');
    await expect.element(cards()).toHaveTextContent('Could not load status counts.');
    await expect.element(list()).toHaveTextContent('Anna');
    await page.getByRole('button', { name: 'Hide performance' }).click();
    await open();
    await expect.element(cards()).toHaveTextContent('Could not load status counts.');
    expect(failed.requests).toHaveLength(1);
    const retried = fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/?search=Anna&cursor=next',
      counts('Anna'),
    );
    await cards().getByRole('button', { name: 'Retry' }).click();
    await expect.element(cards()).toHaveTextContent('123');
    expect(retried.requests).toHaveLength(1);
    expect(first.requests).toHaveLength(1);
    expect(api.list.requests).toHaveLength(1);
  });
  it('restarts an expired count token independently', async () => {
    setup();
    const api = searchApis();
    fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/?search=Anna',
      counts('Anna', 'next'),
    );
    fakeAdminEndpoint(
      'GET',
      '/automations/first/status-stats/?search=Anna&cursor=next',
      {
        errors: [
          { message: 'Expired', type: 'ValidationError', code: 'AUTOMATION_COUNT_CURSOR_EXPIRED' },
        ],
      },
      { status: 422 },
    );
    await start();
    await input().fill('Anna');
    await expect.element(cards()).toHaveTextContent('Could not load status counts.');
    fakeAdminEndpoint('GET', '/automations/first/status-stats/?search=Anna', counts('Anna'));
    await cards().getByRole('button', { name: 'Retry' }).click();
    await expect.element(cards()).toHaveTextContent('123');
    expect(api.list.requests).toHaveLength(1);
  });
  it('continues empty scanning windows and only reports no matches on exhaustion', async () => {
    setup();
    searchApis();
    fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?search=Anna',
      result('Anna', [], 's1', 'scanning'),
    );
    fakeAdminEndpoint('GET', '/automations/first/runs/?search=Anna&cursor=s1', result('Anna', []));
    await start();
    await input().fill('Anna');
    await expect.element(list()).toHaveTextContent('No matching entries.');
    await expect.element(list()).not.toHaveTextContent('Searching more');
  });
  it('bounds scanning requests and lets the user continue list and counts independently', async () => {
    setup();
    const lists = fakeAdminEndpoint('GET', /^\/automations\/first\/runs\/\?/, ({ url }) => {
      const n = Number(new URL(url).searchParams.get('cursor') ?? 0);
      return n < 8 ? result('Anna', [], String(n + 1), 'scanning') : result('Anna');
    });
    const totals = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/status-stats\/\?/,
      ({ url }) => {
        const n = Number(new URL(url).searchParams.get('cursor') ?? 0);
        return counts('Anna', n < 8 ? String(n + 1) : null);
      },
    );
    await start();
    await input().fill('Anna');
    await expect.element(list().getByRole('button', { name: 'Continue search' })).toBeVisible();
    await expect.element(cards().getByRole('button', { name: 'Continue counting' })).toBeVisible();
    expect(lists.requests).toHaveLength(8);
    expect(totals.requests).toHaveLength(8);
    await page.getByRole('button', { name: 'Hide performance' }).click();
    await open();
    await expect.element(list().getByRole('button', { name: 'Continue search' })).toBeVisible();
    await expect.element(cards().getByRole('button', { name: 'Continue counting' })).toBeVisible();
    expect(lists.requests).toHaveLength(8);
    expect(totals.requests).toHaveLength(8);
    await list().getByRole('button', { name: 'Continue search' }).click();
    await expect.element(list()).toHaveTextContent('Anna');
    expect(totals.requests).toHaveLength(8);
    await cards().getByRole('button', { name: 'Continue counting' }).click();
    await expect.element(cards()).toHaveTextContent('123');
  });
  it('loads beyond 50 with whole-panel scrolling and keeps rows on an incremental retry', async () => {
    setup();
    searchApis();
    fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?search=Anna',
      result(
        'Anna',
        Array.from({ length: 50 }, (_, i) => `Anna ${i}`),
        'page2',
      ),
    );
    const failed = fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/?search=Anna&cursor=page2',
      { errors: [{ message: 'Unavailable', type: 'NoPermissionError' }] },
      { status: 403 },
    );
    await start();
    await input().fill('Anna');
    await expect.element(list()).toHaveTextContent('Anna 0');
    expect(failed.requests).toHaveLength(0);
    scroll().scrollTop = scroll().scrollHeight;
    await expect.element(list()).toHaveTextContent('Could not load more runs.');
    fakeAdminEndpoint('GET', '/automations/first/runs/?search=Anna&cursor=page2', {
      ...result('Anna', ['Anna later']),
      automation_runs: [{ ...run('0001', 'Anna later') }],
    });
    await list().getByRole('button', { name: 'Retry' }).click();
    await expect.element(list()).toHaveTextContent('Anna later');
    scroll().scrollTop = 0;
    await expect.element(list()).toHaveTextContent('Anna 0');
  });
  it('keeps selected history through search and sidebar close, and clears search on navigation', async () => {
    setup();
    setup('second');
    respond(history('a'));
    searchApis();
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(canvas()).toBeVisible();
    await page.getByRole('button', { name: 'Search members', exact: true }).click();
    await input().fill('Anna');
    await expect.element(list()).toHaveTextContent('Anna');
    await expect.element(canvas()).toBeVisible();
    await page.getByRole('button', { name: 'Hide performance' }).click();
    await expect.element(canvas()).toBeVisible();
    await open();
    await expect.element(input()).toHaveValue('Anna');
    window.location.hash = '#/automations/second';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await open();
    await expect.element(input()).not.toBeInTheDocument();
    await expect.element(page.getByRole('region', { name: 'Total entries' })).toBeVisible();
  });
  it('keeps compact status controls usable while the whole sidebar scrolls', async () => {
    setup();
    const all = result(
      'Anna',
      Array.from({ length: 50 }, (_, i) => `Anna ${i}`),
    );
    searchApis();
    fakeAdminEndpoint('GET', '/automations/first/runs/?search=Anna', all);
    await start();
    await input().fill('Anna');
    await expect.element(list()).toHaveTextContent('Anna 0');
    await expect.element(cards()).toHaveTextContent('123');
    await expectSidebarAtOrigin();
    await page.screenshot({
      element: document.querySelector('[data-testid="automation-editor"]')!,
      path: '__screenshots__/member-search-results.png',
    });
    document.documentElement.classList.add('dark');
    try {
      await expectSidebarAtOrigin();
      await page.screenshot({
        element: document.querySelector('[data-testid="automation-editor"]')!,
        path: '__screenshots__/member-search-results-dark.png',
      });
    } finally {
      document.documentElement.classList.remove('dark');
    }
    scroll().scrollTop = 900;
    await expect
      .poll(
        () => cards().element().getBoundingClientRect().top < scroll().getBoundingClientRect().top,
      )
      .toBe(true);
    await expect
      .element(cards().getByRole('button', { name: 'Completed', exact: true }))
      .toBeVisible();
    await expectSidebarAtOrigin();
    await page.screenshot({
      element: document.querySelector('[data-testid="automation-editor"]')!,
      path: '__screenshots__/member-search-compact.png',
    });
    await cards().getByRole('button', { name: 'Completed', exact: true }).click();
    await expect.poll(() => scroll().scrollTop).toBe(0);
    await expect
      .element(cards().getByRole('button', { name: 'Completed', exact: true }))
      .toHaveFocus();
    await page.viewport(900, 800);
    await expectSidebarAtOrigin();
    await page.screenshot({
      element: document.querySelector('[data-testid="automation-editor"]')!,
      path: '__screenshots__/member-search-narrow.png',
    });
    await page.viewport(1280, 800);
  });
});
