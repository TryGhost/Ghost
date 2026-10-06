import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import { settleRequests } from '@test-utils/acceptance/worker';
import {
  flags,
  run,
  history,
  setup,
  respond,
  canvas,
  editingCanvas,
  select,
  open,
  close,
} from './run-history.test-utils';

describe('Automation run selection and canvas transitions', () => {
  it('keeps the selected member name in the pill while history loads or fails', async () => {
    setup();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    fakeAdminEndpoint('GET', '/automations/first/runs/a/', async () => {
      await pending;
      return { automation_run_history: [history('a')] };
    });
    fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/b/',
      async () => {
        await pending;
        return { errors: [{ message: 'Unavailable' }] };
      },
      { status: 500 },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    try {
      await select();
      await expect
        .element(canvas().getByRole('status', { name: 'Loading run history' }))
        .toBeVisible();
      expect(canvas().getByRole('button', { name: 'Back to editing' }).element().textContent).toBe(
        'Alex',
      );
      await select('Bea');
      expect(canvas().getByRole('button', { name: 'Back to editing' }).element().textContent).toBe(
        'Bea',
      );
    } finally {
      finish();
    }
    await expect.element(canvas()).toHaveTextContent('Could not load run history');
    await expect
      .element(canvas().getByRole('button', { name: 'Back to editing' }))
      .toHaveTextContent('Bea');
  });

  it.each([390, 800])('switches between the full-width list and history at %spx', async (width) => {
    await page.viewport(width, 844);
    try {
      setup();
      respond(history('a'));
      await renderAdminApp('/automations/first', flags);
      await open();
      await expect(editingCanvas()).toHaveCount(0);
      await select();
      await expect.element(canvas()).toBeVisible();
      await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
      expect(canvas().element().getBoundingClientRect().width).toBeCloseTo(width, 0);
      await open();
      await expect(canvas()).toHaveCount(0);
      await expect
        .element(page.getByRole('button', { name: /View run history for Alex,/ }))
        .toHaveAttribute('aria-pressed', 'true');
      await select();
      await close();
      await expect.element(editingCanvas()).toBeVisible();
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('keeps hidden editing controls out of tab order and restores canvas focus on close', async () => {
    setup();
    respond(history('a'));
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(canvas().getByRole('button', { name: 'Back to editing' })).toHaveFocus();
    await expect(canvas().getByRole('button', { name: 'Refresh run history' })).toHaveCount(0);
    for (let index = 0; index < 8; index++) {
      await userEvent.tab();
      expect(document.activeElement?.closest('[aria-label="Editing canvas"]')).toBeNull();
    }
    await close();
    await expect.element(editingCanvas()).toHaveFocus();
  });

  it('fetches by run ID only when selected, supports keyboard selection, and retains history across sidebar collapse', async () => {
    const { list, counts } = setup();
    const request = respond(history('a'));
    await renderAdminApp('/automations/first', flags);
    await open();
    const selection = page.getByRole('button', { name: /View run history for Alex,/ });
    await expect.element(selection).toBeVisible();
    expect(request.requests).toHaveLength(0);
    (selection.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(canvas()).toHaveTextContent('1 recorded step');
    await expect
      .element(canvas().getByRole('button', { name: 'Back to editing' }))
      .toHaveTextContent('Alex');
    await expect.element(selection).toHaveAttribute('aria-pressed', 'true');
    await expect
      .element(document.querySelector<HTMLElement>('[aria-label="Editing canvas"]'))
      .not.toBeVisible();
    await expect.poll(() => request.requests.length).toBe(1);
    await expect.poll(() => canvas().element().getBoundingClientRect().width).toBe(800);
    await page.getByRole('button', { name: 'Hide performance' }).click();
    await expect.poll(() => canvas().element().getBoundingClientRect().width).toBe(1280);
    await expect.element(canvas()).toHaveTextContent('Alex');
    await open();
    await expect.element(selection).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => canvas().element().getBoundingClientRect().width).toBe(800);
    expect(request.requests).toHaveLength(1);
    expect(list.requests).toHaveLength(1);
    expect(counts.requests).toHaveLength(1);
    await close();
    await expect.element(canvas()).not.toBeInTheDocument();
    await expect.element(editingCanvas()).toBeVisible();
    await expect.element(selection).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps history when filtering removes the selected row', async () => {
    setup();
    const request = respond(history('a'));
    fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?timezone=[^&]+&status=completed$/, {
      meta: { pagination: { limit: 50, next_cursor: null } },
      automation_runs: [run('b', 'Bea')],
    });
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(canvas()).toHaveTextContent('Alex');
    await page.getByRole('button', { name: 'Completed', exact: true }).click();
    await expect
      .element(page.getByRole('button', { name: /View run history for Alex,/ }))
      .not.toBeInTheDocument();
    await expect.element(canvas()).toHaveTextContent('Alex');
    expect(request.requests).toHaveLength(1);
    await page.getByRole('button', { name: 'Hide performance' }).click();
    await close();
    await expect.element(editingCanvas()).toBeVisible();
  });

  it('switches repeated entries by run ID and ignores earlier responses including A to B to A', async () => {
    setup('first', [run('a'), { ...run('b'), created_at: '2026-09-15T12:00:00.000Z' }]);
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const firstRequest = fakeAdminEndpoint('GET', '/automations/first/runs/a/', async () => {
      await pending;
      return { automation_run_history: [history('a', 'Outdated')] };
    });
    respond(history('b', 'Second entry'));
    await renderAdminApp('/automations/first', flags);
    await open();
    const selections = page.getByRole('button', { name: /View run history for Alex,/ });
    await selections.nth(1).click();
    await expect.poll(() => firstRequest.requests.length).toBe(1);
    await expect.element(page.getByRole('status', { name: 'Loading run history' })).toBeVisible();
    await selections.nth(0).click();
    await expect.element(canvas()).toHaveTextContent('Second entry');
    const fresh = respond(history('a', 'Current'));
    await selections.nth(1).click();
    await expect.element(canvas()).toHaveTextContent('Current');
    finish();
    await settleRequests();
    await expect.element(canvas()).not.toHaveTextContent('Outdated');
    expect(fresh.requests).toHaveLength(1);
  });

  it('does not reopen history when a response arrives after returning to editing', async () => {
    setup();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const request = fakeAdminEndpoint('GET', '/automations/first/runs/a/', async () => {
      await pending;
      return { automation_run_history: [history('a')] };
    });
    try {
      await renderAdminApp('/automations/first', flags);
      await open();
      await select();
      await expect.poll(() => request.requests.length).toBe(1);
      await expect.element(page.getByRole('status', { name: 'Loading run history' })).toBeVisible();
      await close();
    } finally {
      finish();
    }
    await settleRequests();
    await expect.element(canvas()).not.toBeInTheDocument();
    await expect.element(editingCanvas()).toBeVisible();
    expect(document.activeElement).toBe(editingCanvas().element());
  });

  it('clears selection on automation navigation and reads fresh history on returning', async () => {
    setup();
    setup('second');
    const request = respond(history('a'));
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(canvas()).toHaveTextContent('Alex');
    window.location.hash = '#/automations/second';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await expect.element(canvas()).not.toBeInTheDocument();
    window.location.hash = '#/automations/first';
    await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
    await expect.element(canvas()).not.toBeInTheDocument();
    await open();
    await select();
    await expect.element(canvas()).toHaveTextContent('Alex');
    expect(request.requests).toHaveLength(2);
  });

  it('shows errors and retries the selected run even after its row disappears', async () => {
    setup();
    fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/a/',
      { errors: [{ message: 'Failed' }] },
      { status: 500 },
    );
    fakeAdminEndpoint('GET', /\/automations\/first\/runs\/\?timezone=[^&]+&status=completed$/, {
      meta: { pagination: { limit: 50, next_cursor: null } },
      automation_runs: [],
    });
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect
      .element(canvas().getByRole('alert'))
      .toHaveTextContent('Could not load run history');
    await page.getByRole('button', { name: 'Completed', exact: true }).click();
    await expect.element(page.getByText('No members match')).toBeVisible();
    const request = respond(history('a'));
    await canvas().getByRole('button', { name: 'Retry' }).click();
    await expect.element(canvas()).toHaveTextContent('Alex');
    expect(request.requests).toHaveLength(1);
  });

  it('handles a missing run with an explicit way back to editing', async () => {
    setup();
    fakeAdminEndpoint(
      'GET',
      '/automations/first/runs/a/',
      { errors: [{ message: 'Not found' }] },
      { status: 404 },
    );
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(canvas()).toHaveTextContent('Run not found');
    await expect.element(canvas().getByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    await close();
    await expect.element(editingCanvas()).toBeVisible();
  });

  it('preserves recorded history for a deleted member', async () => {
    setup('first', [{ ...run('a'), member: null }]);
    respond({ ...history('a'), member: null });
    await renderAdminApp('/automations/first', flags);
    await open();
    await select('Deleted member');
    await expect
      .element(canvas().getByRole('button', { name: 'Back to editing' }))
      .toHaveTextContent('Deleted member');
    await expect.element(canvas()).toHaveTextContent('1 recorded step');
  });
});
