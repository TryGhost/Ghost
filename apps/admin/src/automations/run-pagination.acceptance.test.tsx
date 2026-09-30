import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import { flags, prepareStatuses, run, setupEmbeddedRootFontSize } from './run-list.test-utils';

setupEmbeddedRootFontSize();
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
  await renderAdminApp('/automations/first', flags);
  await page.getByRole('button', { name: 'Show performance' }).click();
};
const scrollToEnd = () => {
  const scroller = region().element().querySelector('div.overflow-y-auto')!;
  scroller.scrollTop = scroller.scrollHeight;
  scroller.dispatchEvent(new Event('scroll'));
};

describe('Automation run pagination', () => {
  it('loads one page near the end, keeps the scrollbar bounded, and retries only a failed next page', async () => {
    prepareStatuses();
    const first = fakeAdminEndpoint(
      'GET',
      /\/automations\/first\/runs\/\?timezone=[^&]+$/,
      pageOfRuns(0, 50, 'next'),
    );
    const failed = fakeAdminEndpoint(
      'GET',
      /\/automations\/first\/runs\/\?timezone=[^&]+&cursor=next$/,
      {},
      { status: 500 },
    );
    await open();
    await expect.element(region().getByText('Member 0', { exact: true })).toBeVisible();
    expect(failed.requests).toHaveLength(0);
    const scroller = region().element().querySelector('div.overflow-y-auto')!;
    expect(scroller.scrollHeight).toBeLessThan(4000);
    scrollToEnd();
    await expect
      .element(region().getByRole('alert'))
      .toHaveTextContent('Could not load more runs.');
    expect(first.requests).toHaveLength(1);
    const retry = fakeAdminEndpoint(
      'GET',
      /\/automations\/first\/runs\/\?timezone=[^&]+&cursor=next$/,
      pageOfRuns(50, 3),
    );
    await region().getByRole('button', { name: 'Retry' }).click();
    scrollToEnd();
    await expect.element(region().getByText('Member 52', { exact: true })).toBeVisible();
    expect(retry.requests).toHaveLength(1);
    expect(first.requests).toHaveLength(1);
    expect(region().element().querySelectorAll('time').length).toBeLessThan(53);
  });

  it('starts a fresh first page when changing direction and ignores a pending old page', async () => {
    const summary = prepareStatuses();
    fakeAdminEndpoint(
      'GET',
      /\/automations\/first\/runs\/\?timezone=[^&]+$/,
      pageOfRuns(0, 50, 'next'),
    );
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const more = fakeAdminEndpoint(
      'GET',
      /\/automations\/first\/runs\/\?timezone=[^&]+&cursor=next$/,
      async () => {
        await pending;
        return pageOfRuns(50, 3);
      },
    );
    const ascending = pageOfRuns(100, 2);
    ascending.automation_runs.reverse();
    let finishSort!: () => void;
    const sorting = new Promise<void>((resolve) => {
      finishSort = resolve;
    });
    const sorted = fakeAdminEndpoint(
      'GET',
      /\/automations\/first\/runs\/\?timezone=[^&]+&order=created_at\+asc$/,
      async () => {
        await sorting;
        return ascending;
      },
    );
    await open();
    await expect.element(region().getByText('Member 0', { exact: true })).toBeVisible();
    scrollToEnd();
    await expect.poll(() => more.requests.length).toBe(1);
    try {
      await region().getByRole('button', { name: 'Entered' }).click();
      await expect
        .element(region().getByRole('status'))
        .toHaveTextContent('Updating automation runs');
      await expect.element(region().getByText('Member 0', { exact: true })).toBeVisible();
      await expect.element(region().getByRole('alert')).not.toBeInTheDocument();
      expect(summary.requests).toHaveLength(1);
    } finally {
      finishSort();
      finish();
    }
    await expect.element(region().getByText('Member 101', { exact: true })).toBeVisible();
    await expect
      .element(region().getByRole('columnheader', { name: 'Entered' }))
      .toHaveAttribute('aria-sort', 'ascending');
    expect(sorted.requests).toHaveLength(1);
    expect(summary.requests).toHaveLength(1);
    await expect.element(region()).not.toHaveTextContent('Member 50');
    expect(region().element().querySelector('div.overflow-y-auto')!.scrollTop).toBe(0);
  });

  it('shows an ordinary error when an older backend ignores ascending order', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?timezone=[^&]+$/, pageOfRuns(0, 2));
    fakeAdminEndpoint(
      'GET',
      /\/automations\/first\/runs\/\?timezone=[^&]+&order=created_at\+asc$/,
      pageOfRuns(0, 2),
    );
    await open();
    await expect.element(region().getByText('Member 0', { exact: true })).toBeVisible();
    await region().getByRole('button', { name: 'Entered' }).click();
    await expect
      .element(region().getByRole('alert'))
      .toHaveTextContent('Could not load automation runs.');
    await expect.element(region()).not.toHaveTextContent('Member 0');
  });
});
