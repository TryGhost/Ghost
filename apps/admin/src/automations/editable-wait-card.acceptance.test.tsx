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

  it('keeps focus while successive edits update the canvas', async () => {
    serve();
    await renderAdminApp('/automations/first', flags);
    const first = waits().nth(0).getByRole('textbox', { name: 'Wait for' });
    await first.click();
    const input = first.element();
    let lostFocus = false;
    const trackBlur = () => {
      lostFocus = true;
    };
    input.addEventListener('blur', trackBlur);
    try {
      for (const days of [2, 3, 4, 5, 6]) {
        await first.fill(String(days));
        await expect.element(waits().nth(0)).toHaveAccessibleName(`Wait: ${days} days`);
        await expect.element(first).toHaveFocus();
        expect(lostFocus).toBe(false);
      }
    } finally {
      input.removeEventListener('blur', trackBlur);
    }
  });

  it('labels the unit inline and keeps non-digits and leading zeros out of the field', async () => {
    const save = serve();
    await renderAdminApp('/automations/first', flags);
    const card = waits().nth(0);
    const first = card.getByRole('textbox', { name: 'Wait for' });
    await expect.element(first).toHaveValue('1');
    await expect.element(card.getByText('Day', { exact: true })).toBeVisible();
    await expect.element(card.getByRole('combobox')).not.toBeInTheDocument();
    await first.fill('2');
    await expect.element(card.getByText('Days', { exact: true })).toBeVisible();
    await first.fill('0');
    await expect.element(first).toHaveValue('');
    await first.fill('05');
    await expect.element(first).toHaveValue('5');
    await first.fill('1.5');
    await expect.element(first).toHaveValue('15');
    await first.fill('7d');
    await expect.element(first).toHaveValue('7');
    await first.fill('abc');
    await expect.element(first).toHaveValue('');
    await first.fill('10');
    await expect.element(first).toHaveValue('10');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => save.requests.length).toBe(1);
    expect(
      (save.requests[0].body as { automations: AutomationDetail[] }).automations[0].actions[0].data,
    ).toEqual({ wait_hours: 240 });
  });

  it('holds the warning until the field is left, then keeps it until the value is valid', async () => {
    const save = serve();
    await renderAdminApp('/automations/first', flags);
    const card = waits().nth(0);
    const first = card.getByRole('textbox', { name: 'Wait for' });
    const warning = card.getByRole('button', { name: 'Why this step needs attention' });
    await first.click();
    await first.fill('');
    await expect.element(first).toHaveFocus();
    await expect.element(warning).not.toBeInTheDocument();
    await userEvent.tab();
    await expect.element(warning).toBeVisible();
    // The card carries the warning; the field itself is never marked invalid.
    await expect.element(first).not.toHaveAttribute('aria-invalid', 'true');
    await first.click();
    await expect.element(warning).toBeVisible();
    await first.fill('31');
    await expect.element(warning).toBeVisible();
    await first.fill('4');
    await expect.element(warning).not.toBeInTheDocument();
    // Fixed once, so the next invalid edit waits for the field to be left again.
    await first.fill('');
    await expect.element(warning).not.toBeInTheDocument();
    // Saving is blocked the whole time, shown or not.
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.element(warning).toBeVisible();
    expect(save.requests).toHaveLength(0);
  });

  it('preserves invalid input and blocks saving or publishing stale valid values', async () => {
    const save = serve();
    await renderAdminApp('/automations/first', flags);
    const first = waits().nth(0).getByRole('textbox', { name: 'Wait for' });
    for (const value of ['', '31', '99']) {
      await first.click();
      await first.fill(value);
      await userEvent.tab();
      await expect.element(first).toHaveValue(value);
      await waits().nth(0).getByRole('button', { name: 'Why this step needs attention' }).click();
      await expect
        .element(page.getByText('Enter a wait between 1 and 30 days.', { exact: true }).last())
        .toBeVisible();
      await userEvent.keyboard('{Escape}');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await page.getByRole('button', { name: 'Publish', exact: true }).click();
      await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
      expect(save.requests).toHaveLength(0);
    }
    await first.click();
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
    await first.fill('31');
    await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
    await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
    expect(save.requests).toHaveLength(0);
    await page.getByRole('link', { name: 'Back to automations' }).click();
    await expect.element(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Stay', exact: true }).click();
    await expect.element(first).toHaveValue('31');
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
    await waits().nth(0).getByRole('textbox', { name: 'Wait for' }).fill('31');
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
