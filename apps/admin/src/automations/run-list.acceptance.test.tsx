import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import {
  openPerformanceSidebar,
  flags,
  read,
  prepareStatuses,
  run,
  runsScroller,
} from './run-list.test-utils';

const entries = () => page.getByRole('region', { name: 'Total entries' });
const statuses = () => page.getByRole('region', { name: 'Automation status counts' });
const statusCard = (name: string) => statuses().getByRole('button', { name, exact: true });
const open = openPerformanceSidebar;
const close = () => page.getByRole('button', { name: 'Hide performance' }).click();

const runsRegion = () => page.getByRole('region', { name: 'Automation runs', exact: true });
// Named cases make the member fallbacks and recorded statuses explicit.
const runsResponse = () => ({
  meta: { pagination: { limit: 50, next_cursor: null } },
  automation_runs: [
    run({ id: 'pending', status: 'in_progress' }),
    run({ id: 'repeat-entry' }),
    run({ id: 'deleted-member', member: null, status: 'exited_early' }),
    run({
      id: 'unnamed-member',
      member: { id: 'unnamed', name: ' ', email: 'no-name@example.com' },
      status: 'completed',
    }),
    run({ id: 'failed-exit', status: 'exited_early', failed: true, member: null }),
    ...Array.from({ length: 5 }, (_, i) => run({ id: `older-${i}`, member: null })),
  ].map((row, index) => ({
    ...row,
    created_at: new Date(Date.UTC(2026, 8, 14 - index, 12)).toISOString(),
  })),
});

describe('Automation run list', () => {
  it('fetches on first opening and shows runs in server order with member and status fallbacks', async () => {
    prepareStatuses();
    const request = fakeAdminEndpoint(
      'GET',
      /\/automations\/first\/runs\/\?timezone=[^&]+$/,
      runsResponse(),
    );
    await renderAdminApp('/automations/first', flags);
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    expect(request.requests).toHaveLength(0);
    await open();
    await expect(
      runsRegion()
        .getByRole('row')
        .filter({ has: page.getByRole('cell') }),
    ).toHaveCount(10);
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(2);
    await expect(runsRegion().getByText('noah@example.com', { exact: true })).toHaveCount(2);
    await expect.element(runsRegion().getByText('Deleted member').first()).toBeVisible();
    await expect.element(runsRegion().getByText('no-name@example.com')).toBeVisible();
    await expect(runsRegion().getByText('no-name@example.com', { exact: true })).toHaveCount(1);
    expect(
      Array.from(runsRegion().element().querySelectorAll('time')).map((time) => time.dateTime),
    ).toEqual(runsResponse().automation_runs.map((row) => row.created_at));
    for (const label of ['In progress', 'Completed', 'Exited early']) {
      await expect.element(runsRegion().getByRole('img', { name: label }).first()).toBeVisible();
    }
    await expect
      .element(runsRegion().getByRole('columnheader', { name: 'Entered' }))
      .toHaveAttribute('aria-sort', 'descending');
    await expect
      .element(runsRegion().getByRole('img', { name: 'Exited early — Failed', exact: true }))
      .toHaveAttribute('title', 'Exited early — Failed');
    await expect(runsRegion().getByRole('link')).toHaveCount(0);
    await expect(runsRegion().getByRole('button', { name: /^View run history/ })).toHaveCount(10);
    expect(request.requests).toHaveLength(1);
  });

  it('shows a scrollable skeleton list and keeps the request running through closing', async () => {
    prepareStatuses();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const request = fakeAdminEndpoint(
      'GET',
      /\/automations\/first\/runs\/\?timezone=[^&]+$/,
      async () => {
        await pending;
        return { meta: { pagination: { limit: 50, next_cursor: null } }, automation_runs: [] };
      },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    try {
      await expect
        .element(runsRegion().getByRole('status'))
        .toHaveTextContent('Loading automation runs');
      await expect.element(runsRegion()).not.toHaveTextContent('No members match');
      await expect.element(runsRegion().getByRole('status')).toHaveClass('sr-only');
      expect(
        runsRegion().element().querySelectorAll('tbody tr[aria-hidden="true"][data-index]'),
      ).toHaveLength(10);
      const scroller = runsScroller();
      expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);
      await close();
    } finally {
      finish();
    }
    await open();
    await expect.element(runsRegion().getByRole('status')).toHaveTextContent('No members match');
    expect(
      runsRegion().element().querySelectorAll('tbody tr[aria-hidden="true"][data-index]'),
    ).toHaveLength(0);
    expect(request.requests).toHaveLength(1);
  });

  it('caches runs across closing, then fetches again on the next visit', async () => {
    prepareStatuses();
    read('second');
    const request = fakeAdminEndpoint(
      'GET',
      /\/automations\/first\/runs\/\?timezone=[^&]+$/,
      runsResponse(),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(2);
    await close();
    await open();
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    expect(request.requests).toHaveLength(1);
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(2);
    window.location.hash = '#/automations/second';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    window.location.hash = '#/automations/first';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    expect(request.requests).toHaveLength(1);
    await open();
    await expect.poll(() => request.requests.length).toBe(2);
  });

  it.each([404, 500])(
    'keeps %s errors until explicit retry without disrupting the chart or counts',
    async (status) => {
      prepareStatuses();
      const request = fakeAdminEndpoint(
        'GET',
        /\/automations\/first\/runs\/\?timezone=[^&]+$/,
        {},
        { status },
      );
      await renderAdminApp('/automations/first', flags);
      await open();
      await expect
        .element(runsRegion().getByRole('alert'))
        .toHaveTextContent('Could not load entries');
      await expect.element(entries()).toHaveTextContent('1,432');
      await expect.element(statusCard('Completed')).toHaveTextContent('1,260');
      await close();
      await open();
      await expect.element(runsRegion().getByRole('alert')).toBeVisible();
      expect(request.requests).toHaveLength(1);
      fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?timezone=[^&]+$/, runsResponse());
      await runsRegion().getByRole('button', { name: 'Retry' }).click();
      await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(2);
      await expect.element(runsRegion().getByRole('alert')).not.toBeInTheDocument();
    },
  );

  it('shows only the error when an empty result fails to refresh, then restores the empty state on retry', async () => {
    prepareStatuses();
    const endpoint = /\/automations\/first\/runs\/\?timezone=[^&]+$/;
    fakeAdminEndpoint('GET', endpoint, {
      meta: { pagination: { limit: 50, next_cursor: null } },
      automation_runs: [],
    });
    const { queryClient } = await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(runsRegion().getByRole('status')).toHaveTextContent('No members match');

    const refresh = fakeAdminEndpoint('GET', endpoint, {}, { status: 500 });
    // The app's authentication bridge can invalidate a previously successful query.
    await queryClient.invalidateQueries();
    await expect
      .element(runsRegion().getByRole('alert'))
      .toHaveTextContent('Could not load entries');
    expect(refresh.requests).toHaveLength(1);
    await expect.element(runsRegion()).not.toHaveTextContent('No members match');

    fakeAdminEndpoint('GET', endpoint, {
      meta: { pagination: { limit: 50, next_cursor: null } },
      automation_runs: [],
    });
    await runsRegion().getByRole('button', { name: 'Retry' }).click();
    await expect.element(runsRegion().getByRole('status')).toHaveTextContent('No members match');
    await expect.element(runsRegion().getByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a malformed response as an error', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?timezone=[^&]+$/, {});
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect
      .element(runsRegion().getByRole('alert'))
      .toHaveTextContent('Could not load entries');
    await expect.element(runsRegion()).not.toHaveTextContent('No members match');
  });

  it('fits long member names and emails inside a narrow sidebar', async () => {
    await page.viewport(400, 800);
    try {
      prepareStatuses();
      const body = runsResponse();
      body.automation_runs[0].member!.name = 'A very long member name '.repeat(10);
      body.automation_runs[1].member!.name = '';
      body.automation_runs[1].member!.email = `${'long'.repeat(20)}@example.com`;
      fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?timezone=[^&]+$/, body);
      await renderAdminApp('/automations/first', flags);
      await open();
      await expect(
        runsRegion()
          .getByRole('row')
          .filter({ has: page.getByRole('cell') }),
      ).toHaveCount(10);
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
