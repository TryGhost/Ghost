import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, fakeMembers, label, renderAdminApp } from '@test-utils/acceptance';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { buildTriggerRules } from './utils/trigger-rules';
import { detail } from './run-history.test-utils';

const picker = () =>
  page.getByRole('combobox', { name: 'Triggered when this label is added to a member:' });
const hint = () => page.getByText('Turn off automation to edit trigger', { exact: true });
const button = (name: string) => page.getByRole('button', { name, exact: true });
const confirm = (name: string) =>
  page.getByRole('alertdialog').getByRole('button', { name, exact: true }).click();

function serve() {
  fakeMembers([]);
  const spring = label({ name: 'Spring ebook' });
  const fall = label({ name: 'Fall guide' });
  const automation: AutomationDetail = {
    ...detail('first'),
    status: 'active',
    trigger_rules: buildTriggerRules({ triggerType: 'label_added', labelId: spring.id }),
  };
  fakeAdminEndpoint('GET', '/automations/first/', { automations: [automation] });
  fakeAdminEndpoint('GET', `/labels/${spring.id}/`, { labels: [spring] });
  fakeAdminEndpoint('GET', `/labels/${fall.id}/`, { labels: [fall] });
  const browse = fakeAdminEndpoint('GET', /^\/labels\/\?/, { labels: [spring, fall] });
  const save = fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => ({
    automations: [
      { ...automation, ...(body as { automations: Partial<AutomationDetail>[] }).automations[0] },
    ],
  }));
  return { spring, fall, automation, browse, save };
}

const render = () =>
  renderAdminApp('/automations/first', {
    labs: { automations: true, automationsLeadMagnets: true },
  });

describe('Live automation label trigger', () => {
  it('unlocks only after turning off, saves a replacement on publish, and locks again', async () => {
    const { spring, fall, automation, browse, save } = serve();
    await render();
    await expect.element(picker()).toHaveTextContent(spring.name);
    await expect.element(picker()).toBeDisabled();
    await expect
      .element(picker())
      .toHaveAccessibleDescription('Turn off automation to edit trigger');
    await expect.element(hint()).toBeVisible();
    await page
      .getByText('Triggered when this label is added to a member:', { exact: true })
      .click();
    await expect.element(page.getByRole('listbox')).not.toBeInTheDocument();
    expect(browse.requests).toHaveLength(0);

    await button('Turn off').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
    await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
    await expect.element(picker()).toBeDisabled();
    expect(save.requests).toHaveLength(0);

    await button('Turn off').click();
    await confirm('Turn off');
    await expect.element(picker()).toBeEnabled();
    await expect.element(hint()).not.toBeInTheDocument();
    expect(save.lastRequest?.body).toMatchObject({
      automations: [{ status: 'inactive', trigger_rules: automation.trigger_rules }],
    });

    await picker().click();
    await page.getByRole('option', { name: fall.name, exact: true }).click();
    await expect.element(picker()).toHaveTextContent(fall.name);
    expect(save.requests).toHaveLength(1);
    await button('Publish').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
    await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
    await expect.element(picker()).toBeEnabled();
    expect(save.requests).toHaveLength(1);

    await button('Publish').click();
    await confirm('Publish');
    await expect.element(picker()).toBeDisabled();
    await expect.element(picker()).toHaveTextContent(fall.name);
    await expect.element(hint()).toBeVisible();
    expect(save.requests).toHaveLength(2);
    expect(save.lastRequest?.body).toMatchObject({
      automations: [
        {
          status: 'active',
          trigger_rules: buildTriggerRules({ triggerType: 'label_added', labelId: fall.id }),
        },
      ],
    });
    await expect.element(page.getByRole('listbox')).not.toBeInTheDocument();
  });

  it('keeps the trigger locked when turning off fails', async () => {
    const { spring } = serve();
    fakeAdminEndpoint(
      'PUT',
      '/automations/first/',
      new Response(
        JSON.stringify({ errors: [{ message: 'Cannot turn off', type: 'ValidationError' }] }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    await render();
    await expect.element(picker()).toBeDisabled();
    await button('Turn off').click();
    await confirm('Turn off');
    await expect.element(button('Retry')).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
    await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
    await expect.element(picker()).toBeDisabled();
    await expect.element(picker()).toHaveTextContent(spring.name);
    await expect.element(hint()).toBeVisible();
  });
});
