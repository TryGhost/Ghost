import { describe, expect, it } from 'vitest';

import { renderAdminApp, siteResponse } from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';
import { fakeStaffWorld, user } from './staff.test-helpers';

function ssoSite() {
  const site = siteResponse();
  site.site.sso_signin_url = 'https://idp.example.com/ghost/start';
  return { response: site };
}

describe('Staff with SSO sign-in', () => {
  it('hides inviting people', async () => {
    const owner = user('Owner');
    const { boot } = fakeStaffWorld({ currentUser: owner, users: [owner, user('Administrator')] });
    await renderAdminApp('/settings/staff', { boot: { ...boot, browseSite: ssoSite() } });

    await expect.element(settingsScreen.users().getByText('Administrator User')).toBeVisible();
    await expect(settingsScreen.users().getByRole('button', { name: 'Invite people' })).toHaveCount(
      0,
    );
  });

  it('hides changing passwords', async () => {
    const owner = user('Owner');
    const administrator = user('Administrator');
    const { boot } = fakeStaffWorld({ currentUser: owner, users: [owner, administrator] });
    await renderAdminApp(`/settings/staff/${administrator.slug}`, {
      boot: { ...boot, browseSite: ssoSite() },
    });

    const modal = settingsScreen.userDetailModal();
    await expect.element(modal.getByLabelText('Full name')).toBeVisible();
    await expect(modal.getByTestId('change-password-button')).toHaveCount(0);
  });
});
