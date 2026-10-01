import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import {
  flags,
  prepareStatuses,
  run,
  runsScroller,
  scrollRunsToEnd,
  setupEmbeddedRootFontSize,
} from './run-list.test-utils';

setupEmbeddedRootFontSize();
const endpoint = /\/automations\/first\/runs\/\?/;
const region = () => page.getByRole('region', { name: 'Automation runs', exact: true });
const pageOfRuns = (start: number, length: number, next: string | null = null) => ({
  automation_runs: Array.from({ length }, (_, index) =>
    run({
      id: `run-${start + index}`,
      created_at: new Date(Date.UTC(2026, 8, 29, 12, -(start + index))).toISOString(),
      member: {
        id: `member-${start + index}`,
        name: `Member ${start + index}`,
        email: `member${start + index}@example.test`,
      },
    }),
  ),
  meta: { pagination: { limit: 50, next_cursor: next } },
});
const open = async () => {
  const { queryClient } = await renderAdminApp('/automations/first', flags);
  await page.getByRole('button', { name: 'Show performance' }).click();
  return queryClient;
};

describe('Automation run pagination', () => {
  it('loads near the end, keeps the scrollbar bounded, and retries only a failed next page', async () => {
    prepareStatuses();
    const requests = fakeAdminEndpoint('GET', endpoint, ({ url }) => {
      if (new URL(url).searchParams.has('cursor')) {
        return Response.json({}, { status: 500 });
      }
      return pageOfRuns(0, 50, 'next');
    });
    await open();
    await expect.element(region().getByText('Member 0', { exact: true })).toBeVisible();
    expect(requests.requests).toHaveLength(1);
    // Reserve space for the loaded page and one loading row, not the entire run history.
    const rowHeight = region()
      .element()
      .querySelector('time')!
      .closest('tr')!
      .getBoundingClientRect().height;
    const headerHeight = region().element().querySelector('thead')!.getBoundingClientRect().height;
    expect(runsScroller().scrollHeight).toBeLessThanOrEqual(
      Math.ceil(51 * rowHeight + headerHeight + 2),
    );
    scrollRunsToEnd();
    await expect.element(region().getByRole('alert')).toHaveTextContent('Could not load more runs');
    expect(requests.requests).toHaveLength(2);
    expect(new URL(requests.requests[1].url).searchParams.get('cursor')).toBe('next');
    const retry = fakeAdminEndpoint('GET', endpoint, pageOfRuns(50, 3));
    await region().getByRole('button', { name: 'Retry' }).click();
    await expect.element(region().getByRole('alert')).not.toBeInTheDocument();
    scrollRunsToEnd();
    await expect.element(region().getByText('Member 52', { exact: true })).toBeVisible();
    expect(retry.requests).toHaveLength(1);
    expect(new URL(retry.requests[0].url).searchParams.get('cursor')).toBe('next');
    expect(region().element().querySelectorAll('time').length).toBeLessThan(53);
  });

  it('resets the first page in both sort directions and ignores a late response from the old page', async () => {
    const summary = prepareStatuses();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let finishSort!: () => void;
    const sorting = new Promise<void>((resolve) => {
      finishSort = resolve;
    });
    const ascending = pageOfRuns(100, 2);
    ascending.automation_runs.reverse();
    const requests = fakeAdminEndpoint('GET', endpoint, async ({ url }) => {
      const params = new URL(url).searchParams;
      if (params.has('cursor')) {
        await pending;
        return pageOfRuns(50, 3);
      }
      if (params.get('order') === 'created_at asc') {
        await sorting;
        return ascending;
      }
      return pageOfRuns(0, 50, 'next');
    });
    const client = await open();
    await expect.element(region().getByText('Member 0', { exact: true })).toBeVisible();
    scrollRunsToEnd();
    await expect.poll(() => requests.requests.length).toBe(2);
    try {
      await region().getByRole('button', { name: 'Entered' }).click();
      await expect
        .element(region().getByRole('status'))
        .toHaveTextContent('Updating automation runs');
      await expect.element(region().getByText('Member 0', { exact: true })).toBeVisible();
      expect(summary.requests).toHaveLength(1);
      finishSort();
      await expect.element(region().getByText('Member 101', { exact: true })).toBeVisible();
      finish();
      // Assert after the abandoned query settles so this actually catches late overwrites.
      await expect.poll(() => client.isFetching()).toBe(0);
      await expect.element(region()).not.toHaveTextContent('Member 50');
      await expect
        .element(region().getByRole('columnheader', { name: 'Entered' }))
        .toHaveAttribute('aria-sort', 'ascending');
      expect(runsScroller().scrollTop).toBe(0);
      await region().getByRole('button', { name: 'Entered' }).click();
      await expect.element(region().getByText('Member 0', { exact: true })).toBeVisible();
      await expect
        .element(region().getByRole('columnheader', { name: 'Entered' }))
        .toHaveAttribute('aria-sort', 'descending');
      expect(requests.requests).toHaveLength(4);
      expect(Object.fromEntries(new URL(requests.requests[3].url).searchParams)).toEqual(
        Object.fromEntries(new URL(requests.requests[0].url).searchParams),
      );
      expect(summary.requests).toHaveLength(1);
    } finally {
      finishSort();
      finish();
    }
  });

  it.each(['status', 'date'] as const)(
    'discards loaded pages when the %s filter changes',
    async (filter) => {
      prepareStatuses();
      const requests = fakeAdminEndpoint('GET', endpoint, ({ url }) => {
        const params = new URL(url).searchParams;
        if (params.has('status') || params.has('date_from')) {
          return pageOfRuns(100, 2);
        }
        return params.has('cursor') ? pageOfRuns(50, 3) : pageOfRuns(0, 50, 'next');
      });
      await open();
      await expect.element(region().getByText('Member 0', { exact: true })).toBeVisible();
      scrollRunsToEnd();
      await expect.element(region().getByText('Member 52', { exact: true })).toBeVisible();
      if (filter === 'status') {
        await page.getByRole('button', { name: 'Completed', exact: true }).click();
      } else {
        await page.getByRole('button', { name: 'Filter performance' }).click();
        await page.getByRole('menuitemradio', { name: 'Last 7 days' }).click();
      }
      await expect.element(region().getByText('Member 100', { exact: true })).toBeVisible();
      await expect.element(region()).not.toHaveTextContent('Member 52');
      expect(runsScroller().scrollTop).toBe(0);
      expect(requests.requests).toHaveLength(3);
      const params = new URL(requests.requests[2].url).searchParams;
      expect(params.has('cursor')).toBe(false);
      expect(params.has(filter === 'status' ? 'status' : 'date_from')).toBe(true);
    },
  );

  it.each([
    { width: 1280, height: 500 },
    { width: 400, height: 600 },
  ])('keeps the list usable in a $width × $height viewport', async (viewport) => {
    await page.viewport(viewport.width, viewport.height);
    try {
      prepareStatuses();
      fakeAdminEndpoint('GET', endpoint, pageOfRuns(0, 50));
      await open();
      await expect.element(region()).toHaveAttribute('aria-busy', 'false');
      await expect.poll(() => runsScroller().clientHeight).toBeGreaterThanOrEqual(144);
      runsScroller().scrollIntoView({ block: 'end' });
      scrollRunsToEnd();
      await expect.element(region().getByText('Member 49', { exact: true })).toBeVisible();
      const lastRow = region()
        .getByText('Member 49', { exact: true })
        .element()
        .getBoundingClientRect();
      expect(lastRow.top).toBeGreaterThanOrEqual(0);
      expect(lastRow.bottom).toBeLessThanOrEqual(window.innerHeight);
    } finally {
      await page.viewport(1280, 800);
    }
  });
});
