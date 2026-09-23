import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { detail, flags, setup, editingCanvas } from './run-history.test-utils';

const serve = (status: AutomationDetail['status'] = 'inactive') => {
  setup();
  const data: AutomationDetail = {
    ...detail('first'),
    status,
    actions: [
      ...detail('first').actions,
      { id: 'second-wait', type: 'wait', data: { wait_hours: 72 } },
    ],
    edges: [{ source_action_id: 'draft-wait', target_action_id: 'second-wait' }],
  };
  fakeAdminEndpoint('GET', '/automations/first/', { automations: [data] });
  return fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => ({
    automations: [
      { ...data, ...(body as { automations: Partial<AutomationDetail>[] }).automations[0] },
    ],
  }));
};
const waits = () => editingCanvas().getByRole('article', { name: /^Wait:/ });

describe('Inline wait editing', () => {
  it('keeps legacy sidebar editing when the flag is off', async () => {
    serve();
    await renderAdminApp('/automations/first', { labs: { automations: true } });
    await page.getByRole('button', { name: 'Wait: 1 day' }).click();
    await page.getByRole('textbox', { name: 'Wait for' }).fill('2');
    await expect.element(page.getByRole('button', { name: 'Wait: 2 days' })).toBeVisible();
    await expect(waits()).toHaveCount(0);
  });

  it('edits independent wait cards and persists whole days as hours', async () => {
    const save = serve();
    await renderAdminApp('/automations/first', flags);
    const first = waits().nth(0).getByRole('textbox', { name: 'Wait for' });
    await first.click();
    await first.fill('2');
    await expect.element(first).toHaveFocus();
    await waits().nth(1).getByRole('textbox', { name: 'Wait for' }).fill('30');
    await expect.element(first).toHaveValue('2');
    await expect
      .element(page.getByRole('complementary', { name: 'Step details' }))
      .not.toBeInTheDocument();
    expect(save.requests).toHaveLength(0);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => save.requests.length).toBe(1);
    const saved = (save.requests[0].body as { automations: AutomationDetail[] }).automations[0];
    expect(saved.actions.map((action) => action.data)).toEqual([
      { wait_hours: 48 },
      { wait_hours: 720 },
    ]);
  });

  it('preserves invalid input and blocks saving or publishing stale valid values', async () => {
    const save = serve();
    await renderAdminApp('/automations/first', flags);
    const first = waits().nth(0).getByRole('textbox', { name: 'Wait for' });
    for (const value of ['', '0', '31', '1.5', '-1', '2e1', '+2']) {
      await first.fill(value);
      await userEvent.tab();
      await expect.element(first).toHaveValue(value);
      await waits().nth(0).getByRole('button', { name: 'Why this step needs attention' }).click();
      await expect
        .element(
          page.getByText('Enter a whole number between 1 and 30 days.', { exact: true }).last(),
        )
        .toBeVisible();
      await userEvent.keyboard('{Escape}');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await page.getByRole('button', { name: 'Publish', exact: true }).click();
      await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
      expect(save.requests).toHaveLength(0);
    }
    await first.fill('2');
    await expect
      .element(waits().nth(0).getByRole('button', { name: 'Why this step needs attention' }))
      .not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => save.requests.length).toBe(1);
    expect(
      (save.requests[0].body as { automations: AutomationDetail[] }).automations[0].actions[0].data,
    ).toEqual({ wait_hours: 48 });
  });

  it('blocks republishing invalid text and guards against losing it on navigation', async () => {
    const save = serve('active');
    await renderAdminApp('/automations/first', flags);
    const first = waits().nth(0).getByRole('textbox', { name: 'Wait for' });
    await first.fill('1.5');
    await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
    await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
    expect(save.requests).toHaveLength(0);
    await page.getByRole('link', { name: 'Back to automations' }).click();
    await expect.element(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Stay', exact: true }).click();
    await expect.element(first).toHaveValue('1.5');
    await first.fill('2');
    await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Publish changes', exact: true })
      .click();
    await expect.poll(() => save.requests.length).toBe(1);
    expect(
      (save.requests[0].body as { automations: AutomationDetail[] }).automations[0].actions[0].data,
    ).toEqual({ wait_hours: 48 });
  });

  it('deletes through the overflow menu without a right-click menu or automatic save', async () => {
    const save = serve();
    await renderAdminApp('/automations/first', flags);
    await waits().nth(0).getByRole('textbox', { name: 'Wait for' }).fill('0');
    await waits().nth(0).getByRole('heading', { name: 'Wait' }).click({ button: 'right' });
    await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
    await waits().nth(0).getByRole('button', { name: 'Wait actions' }).click();
    await expect
      .element(page.getByRole('menuitem', { name: 'Edit settings' }))
      .not.toBeInTheDocument();
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    await expect(waits()).toHaveCount(1);
    await expect
      .element(waits().nth(0).getByRole('textbox', { name: 'Wait for' }))
      .toHaveValue('3');
    expect(save.requests).toHaveLength(0);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => save.requests.length).toBe(1);
  });
});
