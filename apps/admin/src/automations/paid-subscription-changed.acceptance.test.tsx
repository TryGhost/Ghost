import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  fakeAdminEndpoint,
  fakeAutomations,
  renderAdminApp,
  settingsResponse,
} from '@test-utils/acceptance';

const button = (name: string) => page.getByRole('button', { name, exact: true });
const option = (name: string) => page.getByRole('option', { name, exact: true });
const from = () => page.getByRole('combobox', { name: 'From', exact: true });
const to = () => page.getByRole('combobox', { name: 'To', exact: true });
const triggerCard = () =>
  page.getByRole('article', { name: 'Paid subscription changed', exact: true });

const start = async (labs: Record<string, boolean>) => {
  fakeAutomations([]);
  fakeAdminEndpoint('GET', /\/tiers\/\?/, {
    tiers: [
      { id: 'bronze', name: 'Bronze', type: 'paid', active: true },
      { id: 'gold', name: 'Gold', type: 'paid', active: true },
      { id: 'legacy', name: 'Legacy', type: 'paid', active: false },
      { id: 'free', name: 'Free', type: 'free', active: true },
    ],
  });
  const create = fakeAdminEndpoint('POST', '/automations/', { automations: [] });
  await renderAdminApp('/automations/new', {
    labs,
    boot: {
      browseSettings: {
        response: settingsResponse({
          settings: { stripe_secret_key: 'sk_test', stripe_publishable_key: 'pk_test' },
        }),
      },
    },
  });
  await expect.element(page.getByText('Select a trigger', { exact: true })).toBeVisible();
  return create;
};

const pickTrigger = () => page.getByRole('button', { name: /^Paid subscription changed/ }).click();

const choose = async (field: () => ReturnType<typeof from>, name: string) => {
  await field().click();
  await option(name).click();
  await userEvent.keyboard('{Escape}');
};

describe('Paid subscription changed trigger', () => {
  it('is offered only with the lifecycle triggers flag', async () => {
    await start({ automations: true });

    await expect
      .element(page.getByRole('button', { name: /^Paid subscription started/ }))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: /^Paid subscription changed/ }))
      .not.toBeInTheDocument();
  });

  it('asks where a member moves from and to', async () => {
    await start({ automations: true, automationsLifecycleTriggers: true });
    await pickTrigger();

    await expect.element(triggerCard()).toBeVisible();
    await expect.element(from()).toHaveAttribute('placeholder', 'Select tiers...');
    await expect.element(to()).toHaveAttribute('placeholder', 'Select tiers...');

    // Active paid tiers only, under the standalone option.
    await from().click();
    await expect
      .poll(() =>
        page
          .getByRole('option')
          .elements()
          .map((row) => row.textContent),
      )
      .toEqual(['Any paid tier', 'Bronze', 'Gold']);
    await option('Bronze').click();
    await userEvent.keyboard('{Escape}');

    // A tier can't be both where a member starts and where they move to.
    await to().click();
    await expect
      .poll(() =>
        page
          .getByRole('option')
          .elements()
          .map((row) => row.textContent),
      )
      .toEqual(['Free', 'Gold']);
    await option('Free').click();
    await expect
      .element(triggerCard())
      .toHaveTextContent(
        'Members start this automation when their subscription expires, not when they cancel.',
      );
  });

  it('drops a To tier when it is chosen as a From tier', async () => {
    await start({ automations: true, automationsLifecycleTriggers: true });
    await pickTrigger();
    await choose(to, 'Gold');
    await expect.element(button('Remove Gold')).toBeVisible();

    await choose(from, 'Gold');

    await expect.element(triggerCard().getByRole('button', { name: 'Remove Gold' })).toBeVisible();
    await expect.element(to()).toHaveAttribute('placeholder', 'Select tiers...');
  });

  it('asks for both fields before saving', async () => {
    const create = await start({ automations: true, automationsLifecycleTriggers: true });
    await pickTrigger();
    await choose(from, 'Any paid tier');

    await button('Save').click();

    await expect.element(triggerCard()).toHaveTextContent('Select at least one tier.');
    await expect.element(to()).toHaveAttribute('aria-invalid', 'true');
    await expect.element(from()).toHaveAttribute('aria-invalid', 'false');
    expect(create.requests).toHaveLength(0);
  });

  it('fails to save or publish without sending anything, until the API can hold it', async () => {
    const create = await start({ automations: true, automationsLifecycleTriggers: true });
    await pickTrigger();
    await choose(from, 'Any paid tier');
    await choose(to, 'Gold');

    await button('Save').click();

    await expect.element(page.getByText('Automation couldn’t be saved')).toBeVisible();
    await expect.element(button('Retry')).toBeVisible();

    await button('Add step').click();
    await page.getByTestId('step-picker').getByRole('button', { name: /^Wait/ }).click();
    await button('Publish').click();
    const dialog = page.getByRole('alertdialog');
    await dialog.getByRole('button', { name: 'Publish', exact: true }).click();

    await expect.element(dialog.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
    expect(create.requests).toHaveLength(0);
  });
});
