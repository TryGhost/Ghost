import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeAdminStats,
  fakeFrameOrigin,
  fakeSettingsScreens,
  fakeSitePreview,
  renderAdminApp,
  siteResponse,
  staffRole,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import type { StaffRoleName } from '@tryghost/test-data';
import { adminFrameScreen } from '@/layout/admin-frame.screen';

const SITE_URL = String(siteResponse().site.url);
const SITE_ORIGIN = new URL(SITE_URL).origin;

/** View site and the design settings the Customize panel loads. */
async function fakeSiteWorld() {
  await fakeFrameOrigin(SITE_ORIGIN, '<!doctype html>');
  fakeSettingsScreens();
  const themeSettings = fakeAdminEndpoint('GET', '/custom_theme_settings/', {
    custom_theme_settings: [],
  });
  fakeAdminEndpoint('GET', /^\/posts\/.+limit=1/, { posts: [] });
  fakeSitePreview(SITE_URL, '<html><head><style></style></head><body>preview</body></html>');
  // The top bar shows the site's numbers where Customize isn't offered
  fakeAdminStats.memberCount();
  fakeAdminStats.mrr();
  return { themeSettings };
}

function customizeFlags({
  customize,
  role,
}: {
  customize: boolean;
  role?: StaffRoleName;
}): RenderAdminAppOptions {
  const me = currentUserResponse();
  if (role) {
    me.users[0].roles = [staffRole({ name: role })];
  }
  return {
    labs: { admin7Design: true, admin7CustomizeFromViewSite: customize },
    boot: { browseMe: { response: me } },
  };
}

const customizeLink = () => adminFrameScreen.topBar().getByRole('link', { name: 'Customize' });
const designPanel = () => page.getByRole('complementary', { name: 'Design' });

describe('Customize from View site', () => {
  it('opens the design settings over the site', async () => {
    await fakeSiteWorld();
    await renderAdminApp('/site', customizeFlags({ customize: true }));

    await customizeLink().click();

    await expect.poll(currentRoute).toBe('/site?customize');
    await expect.element(designPanel()).toBeVisible();
    await expect.element(customizeLink()).toHaveAttribute('aria-pressed', 'true');
  });

  it('is left out, loading nothing, without admin7CustomizeFromViewSite', async () => {
    const { themeSettings } = await fakeSiteWorld();
    await renderAdminApp('/site?customize', customizeFlags({ customize: false }));

    await expect.element(adminFrameScreen.stat('Members')).toBeVisible();
    await expect.element(customizeLink()).not.toBeInTheDocument();
    await expect.element(designPanel()).not.toBeInTheDocument();
    expect(themeSettings.requests).toHaveLength(0);
  });

  it('is left out for staff who cannot edit the design', async () => {
    const { themeSettings } = await fakeSiteWorld();
    await renderAdminApp('/site?customize', customizeFlags({ customize: true, role: 'Editor' }));

    await expect.element(adminFrameScreen.place('View site')).toBeVisible();
    await expect.element(customizeLink()).not.toBeInTheDocument();
    await expect.element(designPanel()).not.toBeInTheDocument();
    expect(themeSettings.requests).toHaveLength(0);
  });
});
