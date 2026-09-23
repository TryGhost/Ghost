import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import { detail, flags, setup, editingCanvas } from './run-history.test-utils';

describe('Inline card insertion', () => {
  for (const endGrace of ['another step', 'publish'] as const) {
    it(`gives a new email time to be edited until ${endGrace}`, async () => {
      setup();
      const save = fakeAdminEndpoint('PUT', '/automations/first/', {
        automations: [detail('first')],
      });
      await renderAdminApp('/automations/first', flags);
      await page.getByRole('button', { name: 'Add step', exact: true }).click();
      await page
        .getByTestId('step-picker')
        .getByRole('button', { name: /^Email/ })
        .click();
      const email = editingCanvas().getByRole('article', { name: /^Send email/ });
      const warning = email.getByRole('button', { name: 'Why this step needs attention' });
      await email.getByRole('textbox', { name: 'Subject line' }).fill('New subject');
      await expect.element(warning).not.toBeInTheDocument();
      if (endGrace === 'another step') {
        await editingCanvas()
          .getByRole('article', { name: /^Wait:/ })
          .getByRole('textbox', { name: 'Wait for' })
          .click();
      } else {
        await page.getByRole('button', { name: 'Publish', exact: true }).click();
        await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
      }
      await warning.click();
      await expect
        .element(page.getByText('Add a message before this email can be sent.'))
        .toBeVisible();
      await userEvent.keyboard('{Escape}');
      await expect
        .element(page.getByText('Add a message before this email can be sent.'))
        .not.toBeInTheDocument();
      await expect.element(warning).toHaveFocus();
      expect(save.requests).toHaveLength(0);
    });
  }

  for (const type of ['Email', 'Wait'] as const) {
    for (const position of ['append', 'insert'] as const) {
      it(`${position}s ${type} without opening or retaining the settings sidebar`, async () => {
        setup();
        const save = fakeAdminEndpoint('PUT', '/automations/first/', {
          automations: [detail('first')],
        });
        await renderAdminApp('/automations/first', flags);
        // Starting with another step open also checks that stale settings close.
        await page.getByRole('button', { name: 'Trigger: Member signs up' }).click();
        await expect
          .element(page.getByRole('complementary', { name: 'Step details' }))
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
        const cards = editingCanvas().getByRole('article', {
          name: type === 'Email' ? /^Send email/ : /^Wait:/,
        });
        await expect(cards).toHaveCount(type === 'Email' ? 1 : 2);
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
