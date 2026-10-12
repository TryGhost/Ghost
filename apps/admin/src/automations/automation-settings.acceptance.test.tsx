import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import type {
  AutomationDetail,
  EditAutomationPayload,
} from '@tryghost/admin-x-framework/api/automations';
import { detail, setup, flags } from './run-history.test-utils';
import { openAutomationSidebar } from './run-list.test-utils';

const nameField = () => page.getByRole('textbox', { name: 'Name', exact: true });
const descriptionField = () => page.getByRole('textbox', { name: 'Description', exact: true });

describe('Automation settings', () => {
  it.each([
    { status: 'inactive' as const, button: 'Save', savedStatus: 'inactive' },
    { status: 'archived' as const, button: 'Save', savedStatus: 'archived' },
    { status: 'active' as const, button: 'Publish changes', savedStatus: 'active' },
    { status: 'active' as const, button: 'Turn off', savedStatus: 'inactive' },
  ])('persists metadata through explicit $button', async ({ status, button, savedStatus }) => {
    setup();
    let saved = { ...detail('first'), status };
    fakeAdminEndpoint('GET', '/automations/first/', () => ({ automations: [saved] }));
    const edit = fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => {
      saved = {
        ...saved,
        ...(body as { automations: EditAutomationPayload[] }).automations[0],
      };
      return { automations: [saved] };
    });
    await renderAdminApp('/automations/first', flags);
    await openAutomationSidebar();
    await page.getByRole('tab', { name: 'Settings', exact: true }).click();
    await expect.element(nameField()).toHaveValue(saved.name);
    await nameField().fill('Updated welcome flow');
    await descriptionField().fill('Welcome members with a personal message.');
    await page.getByRole('tab', { name: 'Performance', exact: true }).click();
    await page.getByRole('tab', { name: 'Settings', exact: true }).click();
    await expect.element(nameField()).toHaveValue('Updated welcome flow');
    expect(edit.requests).toHaveLength(0);
    await page.getByRole('button', { name: button, exact: true }).click();
    if (button !== 'Save') {
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: button, exact: true })
        .click();
    }
    await expect.poll(() => edit.requests.length).toBe(1);
    expect(
      (edit.requests[0].body as { automations: Partial<AutomationDetail>[] }).automations[0],
    ).toMatchObject({
      name: 'Updated welcome flow',
      description: 'Welcome members with a personal message.',
      status: savedStatus,
      actions: saved.actions,
      edges: saved.edges,
    });
    await expect
      .element(
        page.getByRole('button', {
          name: savedStatus === 'active' ? 'Published' : 'Save',
          exact: true,
        }),
      )
      .toBeDisabled();
    await expect.element(nameField()).toHaveValue('Updated welcome flow');
  });

  it('guards unsaved metadata and allows reverting edits', async () => {
    setup();
    await renderAdminApp('/automations/first', flags);
    await openAutomationSidebar();
    await page.getByRole('tab', { name: 'Settings', exact: true }).click();
    await descriptionField().fill('Unsaved description');
    await page.getByRole('link', { name: 'Back to automations' }).click();
    await expect.element(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Stay' }).click();
    await expect.element(descriptionField()).toHaveValue('Unsaved description');
    await descriptionField().fill('');
    await expect.element(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  });

  it.each([
    { performance: false, settings: false },
    { performance: false, settings: true },
    { performance: true, settings: false },
    { performance: true, settings: true },
  ])(
    'gates sidebar tabs (Performance: $performance, Settings: $settings)',
    async ({ performance, settings }) => {
      const { counts, list } = setup();
      await renderAdminApp('/automations/first', {
        ...flags,
        labs: { ...flags.labs, automationRunAnalytics: performance, automationsPerTier: settings },
      });
      await expect.element(page.getByTestId('automation-canvas')).toBeVisible();
      const toggle = page.getByRole('button', { name: 'Show automation sidebar' });
      if (!performance && !settings) {
        await expect.element(toggle).not.toBeInTheDocument();
        await expect
          .element(page.getByRole('tablist', { name: 'Automation sidebar' }))
          .not.toBeInTheDocument();
      } else {
        await toggle.click();
        await expect
          .element(page.getByRole('tab', { name: performance ? 'Performance' : 'Settings' }))
          .toHaveAttribute('aria-selected', 'true');
        if (performance) {
          await expect.element(page.getByRole('tab', { name: 'Performance' })).toBeVisible();
        } else {
          await expect
            .element(page.getByRole('tab', { name: 'Performance' }))
            .not.toBeInTheDocument();
        }
        if (settings) {
          await page.getByRole('tab', { name: 'Settings' }).click();
          await expect.element(nameField()).toBeVisible();
          await expect.element(descriptionField()).toBeVisible();
        } else {
          await expect.element(page.getByRole('tab', { name: 'Settings' })).not.toBeInTheDocument();
          await expect.element(nameField()).not.toBeInTheDocument();
        }
        await page.getByRole('button', { name: 'Hide automation sidebar' }).click();
        await expect.element(toggle).toBeVisible();
      }
      if (!performance) {
        expect(counts.requests).toHaveLength(0);
        expect(list.requests).toHaveLength(0);
      }
    },
  );
});
