import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import { detail, flags, setup, editingCanvas } from './run-history.test-utils';

describe('Inline card insertion', () => {
  // Keep the add-step picker visible below the email card and its stats.
  beforeEach(() => page.viewport(1280, 1600));
  afterEach(() => page.viewport(1280, 800));

  for (const type of ['Email', 'Wait'] as const) {
    for (const position of ['append', 'insert'] as const) {
      it(`${position}s ${type} without opening or retaining the settings sidebar`, async () => {
        setup();
        const automation = detail('first');
        automation.actions.push({
          id: 'existing-email',
          type: 'send_email',
          stats: {
            email_sent_count: 0,
            email_opened_count: 0,
            email_clicked_count: 0,
            opened_rate: null,
            clicked_rate: null,
          },
          data: { email_subject: 'Existing', email_lexical: '', email_design_setting_id: 'design' },
        });
        automation.edges.push({
          source_action_id: 'draft-wait',
          target_action_id: 'existing-email',
        });
        fakeAdminEndpoint('GET', '/automations/first/', { automations: [automation] });
        const save = fakeAdminEndpoint('PUT', '/automations/first/', {
          automations: [detail('first')],
        });
        await renderAdminApp('/automations/first', {
          labs: { ...flags.labs, automationAnalytics: true },
        });
        // Starting with performance open checks that insertion dismisses it.
        await page.getByRole('button', { name: 'View email analytics' }).click();
        await expect
          .element(page.getByRole('complementary', { name: 'Email performance' }))
          .toBeVisible();
        await page
          .getByRole('button', {
            name: position === 'append' ? 'Add step' : 'Insert step here',
            exact: true,
          })
          .first()
          .click();
        await page
          .getByTestId('step-picker')
          .getByRole('button', { name: new RegExp(`^${type}`) })
          .click();
        await expect
          .element(page.getByRole('complementary', { name: 'Step details' }))
          .not.toBeInTheDocument();
        await expect
          .element(page.getByRole('complementary', { name: 'Email performance' }))
          .not.toBeInTheDocument();
        const cards = editingCanvas().getByRole('article', {
          name: type === 'Email' ? /^Send email/ : /^Wait:/,
        });
        await expect(cards).toHaveCount(2);
        const card = position === 'append' ? cards.last() : cards.first();
        const input = card.getByRole('textbox', {
          name: type === 'Email' ? 'Subject line' : 'Wait for',
          exact: true,
        });
        await input.fill(type === 'Email' ? 'New email draft' : '2');
        await expect.element(input).toHaveValue(type === 'Email' ? 'New email draft' : '2');
        expect(save.requests).toHaveLength(0);
      });
    }

    it(`retains the settings sidebar when adding ${type} with the flag off`, async () => {
      setup();
      await renderAdminApp('/automations/first', { labs: { automations: true } });
      await page.getByRole('button', { name: 'Add step', exact: true }).click();
      await page
        .getByTestId('step-picker')
        .getByRole('button', { name: new RegExp(`^${type}`) })
        .click();
      const sidebar = page.getByRole('complementary', { name: 'Step details' });
      await expect.element(sidebar).toBeVisible();
      await expect
        .element(
          type === 'Email'
            ? sidebar.getByPlaceholder('Subject line')
            : sidebar.getByRole('textbox', { name: 'Wait for' }),
        )
        .toBeVisible();
    });
  }
});
