import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import { flags, prepareStatuses, run } from './run-list.test-utils';

const list = () => page.getByRole('region', { name: 'Automation runs', exact: true });
const input = () => page.getByRole('textbox', { name: 'Search members' });
const result = (cursor: string | null = null, rows = [run()]) => ({
  automation_runs: rows,
  meta: {
    pagination: { limit: 50, next_cursor: cursor, state: cursor ? 'scanning' : 'exhausted' },
  },
});
async function open() {
  await renderAdminApp('/automations/first', flags);
  await page.getByRole('button', { name: 'Show performance' }).click();
}

describe('Automation member search', () => {
  it('searches all time and statuses, keeps sorting, and restores browsing filters on clear', async () => {
    prepareStatuses();
    const requests = fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?/, result());
    await open();
    await page.getByRole('button', { name: 'Filter performance' }).click();
    await page.getByRole('menuitemradio', { name: 'Last 7 days' }).click();
    await page.getByRole('button', { name: 'Completed', exact: true }).click();
    const headingLeft = page
      .getByRole('heading', { name: 'Performance' })
      .element()
      .getBoundingClientRect().left;
    await page.getByRole('button', { name: 'Search members', exact: true }).click();
    await expect.element(input()).toHaveFocus();
    // Opening an empty search replaces the heading rather than squeezing beside it.
    const field = input().element().closest('[data-slot="input-group"]')!;
    expect(field.getBoundingClientRect().left).toBe(headingLeft);
    await input().fill('  a  ');
    await expect
      .poll(() => requests.requests.some((r) => new URL(r.url).searchParams.get('search') === 'a'))
      .toBe(true);
    await expect
      .element(page.getByRole('region', { name: 'Total entries' }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('region', { name: 'Automation status counts' }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Filter performance' }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Clear date filter' }))
      .not.toBeInTheDocument();
    await list().getByRole('button', { name: 'Entered', exact: true }).click();
    await expect
      .poll(() => Object.fromEntries(new URL(requests.requests.at(-1)!.url).searchParams))
      .toEqual({ search: 'a', order: 'created_at asc' });
    await page.getByRole('button', { name: 'Close member search' }).click();
    await expect.element(page.getByRole('region', { name: 'Total entries' })).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Completed', exact: true }))
      .toHaveAttribute('aria-pressed', 'true');
    await expect.element(page.getByRole('button', { name: 'Clear date filter' })).toBeVisible();
    await expect
      .poll(() => new URL(requests.requests.at(-1)!.url).searchParams.get('status'))
      .toBe('completed');
    expect(new URL(requests.requests.at(-1)!.url).searchParams.has('date_from')).toBe(true);
    expect(new URL(requests.requests.at(-1)!.url).searchParams.has('search')).toBe(false);
    await page.getByRole('button', { name: 'Search members', exact: true }).click();
    await expect.element(input()).toHaveValue('');
  });

  it('retries a failed empty-page continuation and displays the later match', async () => {
    prepareStatuses();
    let failed = false;
    const requests = fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?/, ({ url }) => {
      const params = new URL(url).searchParams;
      if (!params.has('search')) {
        return result(null, []);
      }
      if (!params.has('cursor')) {
        return result('next', []);
      }
      if (!failed) {
        failed = true;
        return new Response(null, { status: 500 });
      }
      return result(null, [
        run({ member: { id: 'anna', name: 'Anna', email: 'anna@example.test' } }),
      ]);
    });
    await open();
    await page.getByRole('button', { name: 'Search members', exact: true }).click();
    await input().fill('anna');
    await expect.element(list().getByText('Could not load entries')).toBeVisible();
    await expect.element(list().getByText('No members match')).not.toBeInTheDocument();
    await list().getByRole('button', { name: 'Retry' }).click();
    await expect.element(list().getByText('Anna', { exact: true })).toBeVisible();
    expect(
      requests.requests.filter((r) => new URL(r.url).searchParams.get('cursor') === 'next'),
    ).toHaveLength(2);
  });

  it('continues long scans with a skeleton until exhaustion', async () => {
    prepareStatuses();
    let pages = 0;
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?/, async ({ url }) => {
      if (!new URL(url).searchParams.has('search')) {
        return result(null, []);
      }
      pages += 1;
      if (pages <= 8) {
        return result(`page-${pages}`, []);
      }
      await pending;
      return result(null, []);
    });
    await open();
    await page.getByRole('button', { name: 'Search members', exact: true }).click();
    await input().fill('missing');
    try {
      await expect.poll(() => pages).toBe(9);
      await expect.element(list()).toHaveAttribute('aria-busy', 'true');
      await expect
        .element(list().element().querySelector<HTMLElement>('.animate-pulse'))
        .toBeVisible();
      await expect.element(list().getByText('No members match')).not.toBeInTheDocument();
      await expect
        .element(list().getByRole('button', { name: 'Continue search' }))
        .not.toBeInTheDocument();
    } finally {
      finish();
    }
    await expect.element(list().getByText('No members match')).toBeVisible();
    expect(pages).toBe(9);
    await input().fill('pending');
    await page.getByRole('button', { name: 'Close member search' }).click();
    await expect.element(page.getByRole('button', { name: 'Filter performance' })).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Search members', exact: true }))
      .toHaveFocus();
    await page.getByRole('button', { name: 'Search members', exact: true }).click();
    await expect.element(input()).toHaveValue('');
  });
});
