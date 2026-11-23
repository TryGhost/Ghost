import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  automation,
  fakeAdminEndpoint,
  fakeAutomations,
  fakeMembers,
  label,
  renderAdminApp,
} from '@test-utils/acceptance';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { detail } from './run-history.test-utils';

const picker = () =>
  page.getByRole('combobox', { name: 'Triggered when this label is added to a member:' });
const button = (name: string) => page.getByRole('button', { name, exact: true });

// The server retains label_added with a null ID after deleting an inactive trigger label.
describe('Deleted automation trigger label', () => {
  it('shows the deleted label on reopening and requires a replacement before publishing', async () => {
    const replacement = label({ name: 'Replacement guide' });
    const original: AutomationDetail = {
      ...detail('first'),
      name: 'Recoverable automation',
      trigger_rules: [
        {
          trigger_type: 'label_added',
          label_id: null,
          scope: null,
          product_id: null,
          direction: null,
        },
      ],
    };
    let saved = original;
    fakeAutomations([automation({ id: 'first', name: original.name, status: 'inactive' })]);
    fakeMembers([], { labels: [replacement] });
    fakeAdminEndpoint('GET', '/automations/first/', () => ({ automations: [saved] }));
    fakeAdminEndpoint('GET', `/labels/${replacement.id}/`, { labels: [replacement] });
    const update = fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => {
      saved = { ...saved, ...(body as { automations: AutomationDetail[] }).automations[0] };
      return { automations: [saved] };
    });
    await renderAdminApp('/automations/first', {
      labs: { automations: true, automationsLeadMagnets: true },
    });
    await expect.element(picker()).toHaveTextContent('(label deleted)');
    await expect.element(picker()).toHaveAttribute('aria-invalid', 'true');
    await expect.element(page.getByText('Select a different label', { exact: true })).toBeVisible();
    await button('Publish').click();
    expect(update.requests).toHaveLength(0);
    await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();

    await page.getByRole('link', { name: 'Back to automations', exact: true }).click();
    await page.getByRole('link', { name: original.name, exact: true }).click();
    await expect.element(picker()).toHaveTextContent('(label deleted)');
    await expect.element(page.getByText('Select a different label', { exact: true })).toBeVisible();
    await picker().click();
    await page.getByRole('option', { name: replacement.name, exact: true }).click();
    await expect.element(picker()).not.toHaveAttribute('aria-invalid');
    await expect
      .element(page.getByText('Select a different label', { exact: true }))
      .not.toBeInTheDocument();
    await button('Save').click();
    await expect.poll(() => update.requests.length).toBe(1);
    expect(saved.trigger_rules).toEqual([
      {
        trigger_type: 'label_added',
        label_id: replacement.id,
        scope: null,
        product_id: null,
        direction: null,
      },
    ]);

    await page.getByRole('link', { name: 'Back to automations', exact: true }).click();
    await page.getByRole('link', { name: original.name, exact: true }).click();
    await expect.element(picker()).toHaveTextContent(replacement.name);
    await button('Publish').click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Publish', exact: true })
      .click();
    await expect.poll(() => update.requests.length).toBe(2);
    await expect.element(button('Published')).toBeVisible();
    expect(saved.status).toBe('active');
  });
});
