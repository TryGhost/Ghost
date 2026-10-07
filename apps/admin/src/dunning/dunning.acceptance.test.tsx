import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  configResponse,
  currentUserResponse,
  fakeTags,
  fakeUsers,
  renderAdminApp,
  staffRole,
  staffUser,
} from '@test-utils/acceptance';
import { tagsScreen } from '@/tags/tags.screen';
import { dunningWindow } from '@test-utils/fixtures/dunning';

function configWithDunning(dunning?: unknown) {
  const response = configResponse();
  return {
    config: {
      ...response.config,
      hostSettings: {
        billing: { enabled: true, dunning },
      },
    },
  };
}

describe('Dunning in the Admin layout', () => {
  it.each([
    { label: 'an older backend without dunning config', enabled: true, dunning: undefined },
    { label: 'malformed dunning config', enabled: true, dunning: { active: true } },
    { label: 'the feature flag disabled', enabled: false, dunning: dunningWindow(22) },
  ])('keeps normal navigation usable with $label', async ({ enabled, dunning }) => {
    fakeTags([]);
    await renderAdminApp('/tags', {
      labs: { dunningWarnings: enabled },
      boot: { browseConfig: { response: configWithDunning(dunning) } },
    });

    await expect.element(tagsScreen.newTagLink()).toBeVisible();
    await expect(page.getByTestId('dunning-banner')).toHaveCount(0);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await tagsScreen.internalTab().click();
    await expect.element(tagsScreen.internalTab()).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the owner a warning and payment link before the takeover', async () => {
    fakeTags([]);
    await renderAdminApp('/tags', {
      labs: { dunningWarnings: true },
      boot: { browseConfig: { response: configWithDunning(dunningWindow(2)) } },
    });

    await expect.element(page.getByTestId('dunning-banner')).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Pay now' }))
      .toHaveAttribute('href', '#/pro/update-card/return');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });

  it('fetches only the owner for the staff takeover and restores the page on dismissal', async () => {
    fakeTags([]);
    // Declare the owner-only response and assert the server-side filter below;
    // the fake deliberately does not implement NQL or depend on staff ordering.
    const owner = staffUser({
      name: 'Site Owner',
      email: 'owner@example.com',
      roles: [staffRole({ name: 'Owner' })],
    });
    const usersApi = fakeUsers([owner]);
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: 'Editor' })];
    await renderAdminApp('/tags', {
      labs: { dunningWarnings: true },
      boot: {
        browseConfig: { response: configWithDunning(dunningWindow(22)) },
        browseMe: { response: me },
      },
    });

    await expect.element(page.getByRole('alertdialog')).toBeVisible();
    await expect.element(page.getByText('owner@example.com', { exact: true })).toBeVisible();
    await expect(usersApi).toHaveSentFilter("roles.name:'Owner'");
    expect(usersApi.lastRequest?.limit).toBe(1);
    expect(usersApi.requests).toHaveLength(1);
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect.element(page.getByTestId('dunning-banner')).toBeVisible();
    await tagsScreen.internalTab().click();
    await expect.element(tagsScreen.internalTab()).toHaveAttribute('aria-checked', 'true');
  });
});
