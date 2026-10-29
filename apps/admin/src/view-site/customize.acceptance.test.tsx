import { describe, expect, it, onTestFinished } from 'vitest';
import { page } from 'vitest/browser';
import { cleanup } from 'vitest-browser-react';

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

  it('restores the selected design tab from the URL', async () => {
    await fakeSiteWorld();
    fakeAdminEndpoint('GET', '/custom_theme_settings/', {
      custom_theme_settings: [
        {
          id: 'title',
          key: 'title',
          type: 'text',
          default: '',
          value: '',
        },
      ],
    });
    await renderAdminApp('/site?customize', customizeFlags({ customize: true }));
    await designPanel().getByRole('tab', { name: 'Theme' }).click();
    await expect.poll(currentRoute).toBe('/site?customize=&tab=theme');

    const route = currentRoute();
    await cleanup();
    await renderAdminApp(route, customizeFlags({ customize: true }));
    await expect
      .element(designPanel().getByRole('tab', { name: 'Theme' }))
      .toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the browsed post mounted when switching customizer tabs', async () => {
    await fakeSiteWorld();
    await fakeFrameOrigin(
      SITE_ORIGIN,
      `<!doctype html><script>
      parent.postMessage({ siteFrameLoaded: location.href }, '*');
    </script>`,
    );
    fakeAdminEndpoint('GET', '/custom_theme_settings/', {
      custom_theme_settings: [{ id: 'title', key: 'title', type: 'text', default: '', value: '' }],
    });
    const pages: string[] = [];
    const listener = (event: MessageEvent<{ siteFrameLoaded?: string } | null>) => {
      if (event.origin === SITE_ORIGIN && event.data?.siteFrameLoaded) {
        pages.push(event.data.siteFrameLoaded);
      }
    };
    window.addEventListener('message', listener);
    onTestFinished(() => window.removeEventListener('message', listener));
    await renderAdminApp('/site', customizeFlags({ customize: true }));
    await expect.poll(() => pages.length).toBe(1);
    const frame = page.getByTitle('Site preview').element() as HTMLIFrameElement;
    frame.contentWindow?.location.replace(`${SITE_ORIGIN}/a-post/`);
    await expect.poll(() => pages.at(-1)).toBe(`${SITE_ORIGIN}/a-post/`);

    await customizeLink().click();
    await designPanel().getByRole('tab', { name: 'Theme' }).click();
    await expect.poll(currentRoute).toBe('/site?customize=&tab=theme');
    expect(page.getByTitle('Site preview').element()).toBe(frame);
    await designPanel().getByRole('tab', { name: 'Brand' }).click();
    await expect.poll(currentRoute).toBe('/site?customize=&tab=brand');
    expect(page.getByTitle('Site preview').element()).toBe(frame);
    await designPanel().getByRole('button', { name: 'Close' }).click();
    await expect.poll(currentRoute).toBe('/site');
    expect(page.getByTitle('Site preview').element()).toBe(frame);
    expect(pages).toHaveLength(2);
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
