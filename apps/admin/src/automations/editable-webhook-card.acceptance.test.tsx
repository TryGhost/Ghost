import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { detail, flags, setup, editingCanvas } from './run-history.test-utils';

const serve = () => {
  setup();
  fakeAdminEndpoint('GET', '/automations/first/', { automations: [detail('first')] });
  return fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => ({
    automations: [
      {
        ...detail('first'),
        ...(body as { automations: Partial<AutomationDetail>[] }).automations[0],
      },
    ],
  }));
};

const addWebhook = async () => {
  await page.getByRole('button', { name: 'Add step', exact: true }).click();
  await page
    .getByTestId('step-picker')
    .getByRole('button', { name: /^Webhook/ })
    .click();
  return editingCanvas().getByRole('article', { name: 'Send webhook' });
};

const savedActions = (save: ReturnType<typeof serve>) =>
  (save.requests.at(-1)?.body as { automations: AutomationDetail[] }).automations[0].actions;

describe('Inline webhook editing', () => {
  it('adds a webhook step and saves its configuration', async () => {
    const save = serve();
    await renderAdminApp('/automations/first', flags);
    const card = await addWebhook();

    await card.getByRole('textbox', { name: 'Webhook URL' }).fill('https://example.com/hook');
    await card.getByRole('radio', { name: 'PUT' }).click();
    await card
      .getByRole('textbox', { name: 'Webhook JSON body' })
      .fill('{"email": "{{member.email}}"}');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect.poll(() => save.requests.length).toBe(1);
    expect(savedActions(save).at(-1)).toMatchObject({
      type: 'send_webhook',
      data: {
        url: 'https://example.com/hook',
        method: 'PUT',
        body: '{"email": "{{member.email}}"}',
      },
    });
  });

  it('blocks publishing a webhook without an HTTPS URL or valid JSON', async () => {
    const save = serve();
    await renderAdminApp('/automations/first', flags);
    const card = await addWebhook();
    const url = card.getByRole('textbox', { name: 'Webhook URL' });
    const body = card.getByRole('textbox', { name: 'Webhook JSON body' });

    await url.fill('http://example.com/hook');
    await card.getByRole('button', { name: 'Why this step needs attention' }).click();
    await expect.element(page.getByText('Enter an HTTPS URL.', { exact: true })).toBeVisible();

    await url.fill('https://example.com/hook');
    await body.fill('{"id": {{member.id}}}');
    await card.getByRole('button', { name: 'Why this step needs attention' }).click();
    await expect.element(page.getByText('Enter a valid JSON body.', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect
      .element(page.getByRole('alertdialog', { name: 'Publish automation?' }))
      .not.toBeInTheDocument();
    expect(save.requests).toHaveLength(0);

    await body.fill('{"id": "{{member.id}}"}');
    await expect
      .element(card.getByRole('button', { name: 'Why this step needs attention' }))
      .not.toBeInTheDocument();
  });
});
