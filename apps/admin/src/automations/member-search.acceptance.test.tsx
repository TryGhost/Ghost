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
const chart = () => page.getByRole('region', { name: 'Total entries', exact: true });
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
    entry_buckets: {
      version: 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      entries: cursor ? [] : [{ date: '2026-09-01', count: total }],
    },
    pagination: { next_cursor: cursor, state: cursor ? 'scanning' : 'exhausted' },
  },
});
const statusPath = (search: string, cursor?: string) =>
  `/automations/first/status-stats/?${new URLSearchParams({ search, include_entries: 'true', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, ...(cursor ? { cursor } : {}) })}`;
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
const expectCompactListStart = async () => {
  await expect.poll(() => scroll().contains(cards().element())).toBe(false);
  await expect
    .poll(
      () =>
        cards().element().getBoundingClientRect().bottom <= scroll().getBoundingClientRect().top,
    )
    .toBe(true);
  await expect
    .poll(() =>
      Math.abs(list().element().getBoundingClientRect().top - scroll().getBoundingClientRect().top),
    )
    .toBeLessThanOrEqual(1);
};

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
  it('keeps the summary and list layout with skeletons through debounce and fetching', async () => {
    setup();
    fakeAdminEndpoint('GET', /^\/automations\/first\/entry-stats\/\?/, {
      automation_entry_stats: [
        {
          automation_id: 'first',
          total_run_count: 2,
          entries: [
            { date: '2026-09-01', count: 1 },
            { date: '2026-09-02', count: 1 },
          ],
          window: {
            date_from: '2026-09-01',
            date_to: '2026-09-03',
            bucket: 'day',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
      ],
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const listApi = fakeAdminEndpoint('GET', '/automations/first/runs/?search=Anna', async () => {
      await gate;
      return result('Anna');
    });
    const countApi = fakeAdminEndpoint('GET', statusPath('Anna'), async () => {
      await gate;
      return counts('Anna');
    });
    await start();
    await expect.element(list()).toHaveTextContent('Alex');
    await expect.element(chart().getByRole('figure')).toBeVisible();
    const geometry = () =>
      [chart(), cards(), list()].map((locator) => {
        const rect = locator.element().getBoundingClientRect();
        return { top: rect.top, width: rect.width };
      });
    const before = geometry();
    const expectStableLayout = () => {
      geometry().forEach((rect, index) => {
        expect(Math.abs(rect.top - before[index].top)).toBeLessThanOrEqual(1);
        expect(rect.width).toBe(before[index].width);
      });
    };
    try {
      await input().fill('Anna');
      // Observe the debounce state before a network request has started.
      expect(listApi.requests).toHaveLength(0);
      expect(countApi.requests).toHaveLength(0);
      expectStableLayout();
      await expect
        .element(chart().getByRole('status', { name: 'Loading total entries' }))
        .toBeVisible();
      await expect(cards().getByLabelText('Loading', { exact: true })).toHaveCount(3);
      await expect.element(list().getByText('Loading automation runs')).toBeInTheDocument();
      await expect.element(list()).not.toHaveTextContent('Alex');
      await expect.element(page.getByText('Updating member search…')).not.toBeInTheDocument();
      await userEvent.keyboard('{Enter}');
      await expect.poll(() => listApi.requests.length).toBe(1);
      await expect.poll(() => countApi.requests.length).toBe(1);
      expectStableLayout();
      await expect
        .element(chart().getByRole('status', { name: 'Loading total entries' }))
        .toBeVisible();
      await page.screenshot({
        element: document.querySelector('aside')!,
        path: '__screenshots__/member-search-loading.png',
      });
    } finally {
      release();
    }
    await expect.element(list()).toHaveTextContent('Anna');
    await expect.element(cards()).toHaveTextContent('123');
    expectStableLayout();
  });
  it('opens with focus, keeps the searched chart visible, clears and closes with deliberate focus', async () => {
    const base = setup();
    const api = searchApis();
    await start();
    await expect.element(input()).toHaveFocus();
    await expect.element(page.getByRole('region', { name: 'Total entries' })).toBeVisible();
    expect(api.list.requests).toHaveLength(0);
    await input().fill('  Anna  ');
    await expect
      .element(page.getByRole('region', { name: 'Total entries' }))
      .toHaveTextContent('123');
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
  it('keeps the entry range through search, sorting and count continuation, and resets it on clearing', async () => {
    setup();
    const entryWindow = (url: string) => {
      const q = new URL(url).searchParams;
      return q.has('date_from')
        ? {
            date_from: q.get('date_from'),
            date_to: new Date(Date.parse(q.get('date_to')!) + 86400000).toISOString().slice(0, 10),
            timezone: q.get('timezone'),
            bucket: 'day',
          }
        : undefined;
    };
    const lists = fakeAdminEndpoint('GET', /^\/automations\/first\/runs\/(?:\?|$)/, ({ url }) => {
      const data = result(new URL(url).searchParams.get('search') ?? '', ['Anna']);
      return { ...data, meta: { ...data.meta, entry_window: entryWindow(url) } };
    });
    const summaries = fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/status-stats\/(?:\?|$)/,
      ({ url }) => {
        const q = new URL(url).searchParams;
        const data = counts(
          q.get('search') ?? '',
          q.has('search') && !q.has('cursor') ? 'next-count' : null,
          7,
        );
        return {
          ...data,
          automation_status_stats: data.automation_status_stats.map((row) => ({
            ...row,
            entry_window: entryWindow(url),
          })),
          meta: {
            ...data.meta,
            entry_window: entryWindow(url),
            entry_buckets: {
              ...data.meta.entry_buckets,
              entries: data.meta.pagination.next_cursor
                ? []
                : [{ date: q.get('date_from') ?? '2026-09-01', count: 7 }],
            },
          },
        };
      },
    );
    await start();
    await page.getByRole('button', { name: 'Filter performance', exact: true }).click();
    await page.getByRole('menuitemradio', { name: 'Last 7 days' }).click();
    await expect.element(cards()).toHaveTextContent('7');
    await input().fill('Anna');
    await expect.element(list()).toHaveTextContent('Anna');
    await expect.element(cards()).toHaveTextContent('7');
    await expect.element(chart()).toHaveTextContent('7');
    await expect
      .element(page.getByRole('button', { name: 'Clear date filter' }))
      .toHaveTextContent('Last 7 days');
    await expect
      .poll(() =>
        summaries.requests.some((r) => new URL(r.url).searchParams.get('cursor') === 'next-count'),
      )
      .toBe(true);
    await list().getByRole('button', { name: 'Entered', exact: true }).click();
    await expect
      .poll(() => new URL(lists.lastRequest!.url).searchParams.get('order'))
      .toBe('created_at asc');
    for (const capture of [lists, summaries]) {
      const q = new URL(capture.lastRequest!.url).searchParams;
      expect(q.get('search')).toBe('Anna');
      expect(q.has('date_from')).toBe(true);
      expect(q.has('date_to')).toBe(true);
    }
    await page.getByRole('button', { name: 'Clear date filter' }).click();
    await expect
      .poll(() => new URL(lists.lastRequest!.url).searchParams.has('date_from'))
      .toBe(false);
    expect(new URL(lists.lastRequest!.url).searchParams.get('search')).toBe('Anna');
    expect(new URL(lists.lastRequest!.url).searchParams.has('cursor')).toBe(false);
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
    await expect.element(chart()).toHaveTextContent('123');
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
    const staleCounts = fakeAdminEndpoint('GET', statusPath('Old'), async () => {
      await gate;
      return counts('Old', null, 999);
    });
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
  it('keeps searched cards and list usable when older Core lacks chart buckets', async () => {
    setup();
    searchApis();
    const old = counts('Anna');
    const meta = { ...old.meta, entry_buckets: undefined };
    fakeAdminEndpoint('GET', statusPath('Anna'), { ...old, meta });
    await start();
    await input().fill('Anna');
    await expect.element(cards()).toHaveTextContent('123');
    await expect.element(list()).toHaveTextContent('Anna');
    await expect.element(chart()).toHaveTextContent('Entry analytics are unavailable');
    await expect.element(chart()).not.toHaveTextContent('123');
  });
  it('shows a zero searched chart for no matching entries', async () => {
    setup();
    searchApis();
    fakeAdminEndpoint('GET', statusPath('Anna'), counts('Anna', null, 0));
    fakeAdminEndpoint('GET', '/automations/first/runs/?search=Anna', result('Anna', []));
    await start();
    await input().fill('Anna');
    await expect.element(list()).toHaveTextContent('No matching entries.');
    await expect.element(chart()).toHaveTextContent('0');
    await expect.element(chart()).not.toHaveTextContent('unavailable');
  });
  it('finishes count continuations without exposing partial totals or resetting the list', async () => {
    setup();
    const api = searchApis();
    fakeAdminEndpoint('GET', statusPath('Anna'), {
      ...counts('Anna', 'count-next'),
      meta: {
        ...counts('Anna', 'count-next').meta,
        entry_buckets: {
          ...counts('Anna').meta.entry_buckets,
          entries: [{ date: '2026-09-01', count: 50 }],
        },
      },
    });
    const more = fakeAdminEndpoint('GET', statusPath('Anna', 'count-next'), {
      ...counts('Anna'),
      meta: {
        ...counts('Anna').meta,
        entry_buckets: {
          ...counts('Anna').meta.entry_buckets,
          entries: [{ date: '2026-09-01', count: 73 }],
        },
      },
    });
    await start();
    await input().fill('Anna');
    await expect.element(cards()).toHaveTextContent('123');
    await expect.element(chart()).toHaveTextContent('123');
    expect(more.requests).toHaveLength(1);
    expect(api.list.requests).toHaveLength(1);
  });
  it('retries a failed count page without replaying earlier pages or resetting the list', async () => {
    setup();
    const api = searchApis();
    const first = fakeAdminEndpoint('GET', statusPath('Anna'), counts('Anna', 'next'));
    const failed = fakeAdminEndpoint(
      'GET',
      statusPath('Anna', 'next'),
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
    const retried = fakeAdminEndpoint('GET', statusPath('Anna', 'next'), counts('Anna'));
    await cards().getByRole('button', { name: 'Retry' }).click();
    await expect.element(cards()).toHaveTextContent('123');
    await expect.element(chart()).toHaveTextContent('123');
    expect(retried.requests).toHaveLength(1);
    expect(first.requests).toHaveLength(1);
    expect(api.list.requests).toHaveLength(1);
  });
  it('restarts an expired count token independently', async () => {
    setup();
    const api = searchApis();
    fakeAdminEndpoint('GET', statusPath('Anna'), counts('Anna', 'next'));
    fakeAdminEndpoint(
      'GET',
      statusPath('Anna', 'next'),
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
    fakeAdminEndpoint('GET', statusPath('Anna'), counts('Anna'));
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
    await expect.element(list()).toHaveTextContent('Anna');
    await expectCompactListStart();
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
  it('keeps the compact controls through short, empty and failed filters, sorting and date resizing', async () => {
    const many = Array.from({ length: 50 }, (_, i) => run(String(999 - i), `Member ${i}`));
    setup('first', many);
    fakeAdminEndpoint('GET', '/automations/first/runs/?status=completed', {
      automation_runs: [run('one', 'Only result')],
    });
    fakeAdminEndpoint('GET', '/automations/first/runs/?status=exited_early', {
      automation_runs: [],
    });
    fakeAdminEndpoint('GET', '/automations/first/runs/?status=in_progress', {}, { status: 500 });
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(list()).toHaveTextContent('Member 0');
    scroll().scrollTop = 900;
    await expect.poll(() => scroll().contains(cards().element())).toBe(false);
    await expect
      .poll(
        () =>
          cards().element().getBoundingClientRect().bottom <= scroll().getBoundingClientRect().top,
      )
      .toBe(true);

    const completed = () => cards().getByRole('button', { name: 'Completed', exact: true });
    await completed().click();
    await expect.element(list()).toHaveTextContent('Only result');
    await expectCompactListStart();
    await expect.element(completed()).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect.element(list()).toHaveTextContent('Member 0');
    await expectCompactListStart();

    await cards().getByRole('button', { name: 'Exited early', exact: true }).click();
    await expect.element(list()).toHaveTextContent('No matching entries.');
    await expectCompactListStart();
    await cards().getByRole('button', { name: 'In progress', exact: true }).click();
    await expect.element(list()).toHaveTextContent('Could not load automation runs.');
    await expectCompactListStart();
    fakeAdminEndpoint('GET', '/automations/first/runs/?status=in_progress', {
      automation_runs: [run('retry', 'Retry result')],
    });
    await list().getByRole('button', { name: 'Retry', exact: true }).click();
    await expect.element(list()).toHaveTextContent('Retry result');
    await expectCompactListStart();

    fakeAdminEndpoint('GET', /^\/automations\/first\/runs\/\?status=in_progress&order=/, {
      automation_runs: [run('sorted', 'Sorted result')],
    });
    await list().getByRole('button', { name: 'Entered', exact: true }).click();
    await expect.element(list()).toHaveTextContent('Sorted result');
    await expectCompactListStart();

    await page.getByRole('button', { name: 'Filter performance', exact: true }).click();
    fakeAdminEndpoint('GET', /^\/automations\/first\/status-stats\/\?timezone=/, {
      automation_status_stats: [
        {
          automation_id: 'first',
          in_progress_run_count: 1,
          completed_run_count: 0,
          exited_early_run_count: 0,
          unclassified_run_count: 0,
        },
      ],
    });
    fakeAdminEndpoint('GET', /^\/automations\/first\/runs\/\?timezone=/, { automation_runs: [] });
    await page.getByRole('menuitemradio', { name: 'Last 7 days' }).click();
    await expectCompactListStart();
    await page.getByRole('button', { name: 'Filter performance', exact: true }).click();
    await page.getByRole('menuitemradio', { name: 'All time' }).click();
    await expect
      .poll(
        () =>
          cards().element().getBoundingClientRect().bottom <= scroll().getBoundingClientRect().top,
      )
      .toBe(true);
    await page.viewport(900, 650);
    await expectSidebarAtOrigin();
    scroll().scrollTop = 0;
    await expect.element(page.getByRole('region', { name: 'Total entries' })).toBeVisible();
    await expect
      .poll(
        () => cards().element().getBoundingClientRect().top > scroll().getBoundingClientRect().top,
      )
      .toBe(true);
    await page.viewport(1280, 800);
  });
});
