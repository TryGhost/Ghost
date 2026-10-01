import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import {
  flags,
  response,
  prepareStatuses,
  run,
  setupEmbeddedRootFontSize,
} from './run-list.test-utils';

setupEmbeddedRootFontSize();

const entries = () => page.getByRole('region', { name: 'Total entries' });
const statuses = () => page.getByRole('region', { name: 'Automation status counts' });
const statusCard = (name: string) => statuses().getByRole('button', { name, exact: true });
const open = () => page.getByRole('button', { name: 'Show performance' }).click();
const close = () => page.getByRole('button', { name: 'Hide performance' }).click();

const runsRegion = () => page.getByRole('region', { name: 'Automation runs', exact: true });
const filteredRunsResponse = (
  status: 'in_progress' | 'completed' | 'exited_early',
  name: string,
) => ({
  automation_runs: [
    {
      ...run(),
      id: `${status}-run`,
      status,
      member: { id: `${status}-member`, name, email: `${status}@example.com` },
    },
  ],
});

describe('Automation run status filtering', () => {
  it('keeps the summary cached while filtering runs, including clearing and reselection', async () => {
    prepareStatuses();
    let completedCount = 1260;
    const summary = fakeAdminEndpoint('GET', /^\/automations\/first\/performance-stats\/\?/, () => {
      const stats = response('first', {
        inProgress: 118,
        completed: completedCount,
        exitedEarly: 54,
      });
      completedCount += 1;
      return stats;
    });
    const all = fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?timezone=[^&]+$/, {
      automation_runs: [run()],
    });
    const filteredRequests = (['in_progress', 'completed', 'exited_early'] as const).map((status) =>
      fakeAdminEndpoint(
        'GET',
        new RegExp(`/automations/first/runs/\\?timezone=[^&]+&status=${status}$`),
        filteredRunsResponse(status, `${status} member`),
      ),
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(entries()).toHaveTextContent('1,432');
    for (const [label, status] of [
      ['Completed', 'completed'],
      ['Exited early', 'exited_early'],
      ['In progress', 'in_progress'],
    ]) {
      await statusCard(label).click();
      await expect.element(statusCard(label)).toHaveAttribute('aria-pressed', 'true');
      await expect.element(runsRegion()).toHaveTextContent(`${status} member`);
      await expect.element(statusCard('Completed')).toHaveAccessibleDescription('1,260');
    }
    await statusCard('In progress').click();
    await expect.element(statusCard('In progress')).toHaveAttribute('aria-pressed', 'false');
    await expect.element(entries()).toHaveTextContent('1,432');
    await expect(runsRegion().getByText('Noah Bennett', { exact: true })).toHaveCount(1);
    expect(summary.requests).toHaveLength(1);
    expect(all.requests).toHaveLength(2);
    await close();
    await open();
    await expect.element(entries()).toHaveTextContent('1,432');
    expect(summary.requests).toHaveLength(1);
    // Returning to a previous filter must fetch again rather than reuse its old result.
    await statusCard('Completed').click();
    await expect.element(entries()).toHaveTextContent('1,432');
    await expect.element(runsRegion()).toHaveTextContent('completed member');
    expect(summary.requests).toHaveLength(1);
    expect(filteredRequests[1].requests).toHaveLength(2);
  });

  it('retains rows and summary while a status filter loads without growing the list', async () => {
    const summary = prepareStatuses();
    fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?timezone=[^&]+$/, {
      automation_runs: [run()],
    });
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    fakeAdminEndpoint(
      'GET',
      /\/automations\/first\/runs\/\?timezone=[^&]+&status=completed$/,
      async () => {
        await pending;
        return filteredRunsResponse('completed', 'Filtered member');
      },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(runsRegion()).toHaveTextContent('Noah Bennett');
    await expect.element(entries().getByRole('figure')).toBeInTheDocument();
    const height = runsRegion().element().getBoundingClientRect().height;
    const chart = entries().getByRole('figure').element();
    try {
      await statusCard('Completed').click();
      await expect
        .element(runsRegion().getByRole('status'))
        .toHaveTextContent('Updating automation runs');
      await expect.element(runsRegion()).toHaveAttribute('aria-busy', 'true');
      await expect.element(runsRegion()).toHaveTextContent('Noah Bennett');
      expect(runsRegion().element().getBoundingClientRect().height).toBeCloseTo(height, 0);
      expect(entries().getByRole('figure').element()).toBe(chart);
      await expect.element(statusCard('Completed')).toHaveAccessibleDescription('1,260');
      expect(summary.requests).toHaveLength(1);
    } finally {
      finish();
    }
    await expect.element(runsRegion()).toHaveTextContent('Filtered member');
    await expect.element(runsRegion()).not.toHaveTextContent('Noah Bennett');
    await expect.element(runsRegion()).toHaveAttribute('aria-busy', 'false');
    await expect.element(runsRegion().getByRole('status')).not.toBeInTheDocument();
  });

  it('supports Tab, Space and Enter on status cards', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?timezone=[^&]+$/, {
      automation_runs: [],
    });
    fakeAdminEndpoint(
      'GET',
      /\/automations\/first\/runs\/\?timezone=[^&]+&status=completed$/,
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
    await expect.element(runsRegion().getByRole('status')).toHaveTextContent('No entries yet');
  });

  it('allows zero-count cards to show no matches and clear the filter', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?timezone=[^&]+$/, {
      automation_runs: [],
    });
    fakeAdminEndpoint(
      'GET',
      /^\/automations\/first\/performance-stats\/\?/,
      response('first', { inProgress: 118, completed: 0, exitedEarly: 54 }),
    );
    fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?timezone=[^&]+&status=completed$/, {
      automation_runs: [],
    });
    await renderAdminApp('/automations/first', flags);
    await open();
    await expect.element(statusCard('Completed')).toHaveTextContent('0');
    await statusCard('Completed').click();
    await expect.element(runsRegion().getByRole('status')).toHaveTextContent('No matching entries');
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'true');
    await statusCard('Completed').click();
    await expect.element(runsRegion().getByRole('status')).toHaveTextContent('No entries yet');
  });

  it('refetches a failed filter on reselection and supports explicit retry while idle', async () => {
    prepareStatuses();
    fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?timezone=[^&]+$/, {
      automation_runs: [],
    });
    const request = fakeAdminEndpoint(
      'GET',
      /\/automations\/first\/runs\/\?timezone=[^&]+&status=completed$/,
      {},
      { status: 500 },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await statusCard('Completed').click();
    await expect
      .element(runsRegion().getByRole('alert'))
      .toHaveTextContent('Could not load automation runs');
    await statusCard('Completed').click();
    await expect.element(runsRegion().getByRole('status')).toHaveTextContent('No entries yet');
    await statusCard('Completed').click();
    await expect.element(runsRegion().getByRole('alert')).toBeVisible();
    expect(request.requests).toHaveLength(2);
    const retry = fakeAdminEndpoint(
      'GET',
      /\/automations\/first\/runs\/\?timezone=[^&]+&status=completed$/,
      filteredRunsResponse('completed', 'Recovered member'),
    );
    await runsRegion().getByRole('button', { name: 'Retry' }).click();
    await expect.element(runsRegion()).toHaveTextContent('Recovered member');
    expect(retry.requests).toHaveLength(1);
    await expect.element(statusCard('Completed')).toHaveAttribute('aria-pressed', 'true');
  });
});
