import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import {
  MAX_AUTOMATION_ACTIONS,
  type AutomationDetail,
} from '@tryghost/admin-x-framework/api/automations';
import { detail, flags, setup, editingCanvas } from './run-history.test-utils';

describe('Editor trigger and exit marker', () => {
  it('keeps both boundary cards non-interactive with no settings or context menu', async () => {
    setup();
    await renderAdminApp('/automations/first', flags);
    for (const name of ['Member signs up', 'Exit automation']) {
      const card = editingCanvas().getByRole('article', { name, exact: true });
      await card.click();
      await card.click({ button: 'right' });
      await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
      await expect
        .element(page.getByRole('complementary', { name: 'Step details' }))
        .not.toBeInTheDocument();
      await expect(card.getByRole('button')).toHaveCount(0);
    }
    await expect.element(page.getByTestId('add-step-tail-button')).not.toBeInTheDocument();
  });

  it('appends to an empty workflow without persisting the trigger or exit as actions', async () => {
    setup();
    const automation: AutomationDetail = { ...detail('first'), actions: [], edges: [] };
    fakeAdminEndpoint('GET', '/automations/first/', { automations: [automation] });
    const save = fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => body);
    await renderAdminApp('/automations/first', flags);
    await page.getByRole('button', { name: 'Add step', exact: true }).click();
    await page.getByTestId('step-picker').getByRole('button', { name: /^Wait/ }).click();
    await expect(editingCanvas().getByRole('article', { name: /^Wait:/ })).toHaveCount(1);
    await expect(
      editingCanvas().getByRole('article', { name: 'Exit automation', exact: true }),
    ).toHaveCount(1);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => save.requests.length).toBe(1);
    const saved = (save.requests[0].body as { automations: AutomationDetail[] }).automations[0];
    expect(saved.actions).toHaveLength(1);
    expect(saved.actions[0].type).toBe('wait');
    expect(saved.edges).toEqual([]);
  });

  it('keeps the exit marker at the step limit and disables all insertion points', async () => {
    setup();
    const actions: AutomationDetail['actions'] = Array.from(
      { length: MAX_AUTOMATION_ACTIONS },
      (_, index) => ({
        id: `wait-${index}`,
        type: 'wait',
        data: { wait_hours: 24 },
      }),
    );
    const automation = {
      ...detail('first'),
      actions,
      edges: actions.slice(1).map((action, index) => ({
        source_action_id: actions[index].id,
        target_action_id: action.id,
      })),
    };
    fakeAdminEndpoint('GET', '/automations/first/', { automations: [automation] });
    await renderAdminApp('/automations/first', flags);
    await expect(
      editingCanvas().getByRole('article', { name: 'Exit automation', exact: true }),
    ).toHaveCount(1);
    await expect
      .element(page.getByRole('button', { name: 'Add step', exact: true }))
      .toBeDisabled();
    const inserts = page.getByRole('button', { name: 'Insert step here', exact: true });
    await expect(inserts).toHaveCount(MAX_AUTOMATION_ACTIONS);
    for (let index = 0; index < MAX_AUTOMATION_ACTIONS; index++) {
      await expect.element(inserts.nth(index)).toBeDisabled();
    }
    await expect.element(page.getByTestId('step-limit-tail-node')).not.toBeInTheDocument();
  });

  it('retains the trigger settings and rectangular add button with the flag off', async () => {
    setup();
    await renderAdminApp('/automations/first', { labs: { automations: true } });
    await page.getByRole('button', { name: 'Trigger: Member signs up' }).click();
    await expect.element(page.getByRole('complementary', { name: 'Step details' })).toBeVisible();
    await expect.element(page.getByText('Free', { exact: true })).toBeVisible();
    await expect.element(page.getByTestId('add-step-tail-button')).toBeVisible();
    await expect
      .element(page.getByRole('article', { name: 'Exit automation' }))
      .not.toBeInTheDocument();
  });
});
