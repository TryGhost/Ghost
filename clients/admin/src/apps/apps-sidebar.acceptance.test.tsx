import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeTags,
  renderAdminApp,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { PINS_FULL_HINT } from './lib/pins';
import { appsScreen } from './apps.screen';
import {
  fakeAppPage,
  fakeInstallations,
  fakeSessionStart,
  installation,
  labs,
  manifest,
  readPath,
} from './apps.test-utils';

const app = (n: number, overrides: Partial<AppInstallation> = {}): AppInstallation =>
  installation({
    id: `installation-${n}`,
    app_id: `com.example.app${n}`,
    manifest_url: `https://app${n}.example.com/ghost-app.json`,
    manifest: manifest({ id: `com.example.app${n}`, name: `App ${n}` }),
    created_at: `2026-10-0${n}T10:00:00.000Z`,
    ...overrides,
  });

const FOUR_APPS = [app(1), app(2), app(3), app(4)];

/** Signs in with these sidebar pins saved, and the apps flag on. */
function withPins(pins?: { pinned: string[]; unpinned: string[] }): RenderAdminAppOptions {
  const me = currentUserResponse();
  if (pins) {
    me.users[0].accessibility = JSON.stringify({
      navigation: { expanded: { posts: true, members: true }, menu: { visible: true }, apps: pins },
    });
  }
  return { labs, boot: { browseMe: { response: me } } };
}

/** The sidebar pins a preference write saves, if it saves any. */
function pinsIn(body: unknown) {
  const users = (body as { users: Array<{ accessibility: string }> }).users;
  const preferences = JSON.parse(users[0].accessibility) as {
    navigation?: { apps?: { pinned: string[]; unpinned: string[] } };
  };
  return preferences.navigation?.apps;
}

/** Echoes preference writes, so they persist, and reads back the pins they saved. */
function fakePreferencesApi() {
  const api = fakeAdminEndpoint('PUT', /^\/users\/\w+\//, ({ body }) => body);
  return {
    savedPins: () => {
      const last = api.requests.at(-1);
      return last && pinsIn(last.body);
    },
  };
}

/**
 * Holds each write of the pins until the spec answers it, oldest first, so it
 * can say what's on screen while saves are on their way. Other preference
 * writes, like Admin's own on boot, go straight through.
 */
function holdPinSaves() {
  const sent: unknown[] = [];
  const waiting: Array<(response?: Response) => void> = [];
  fakeAdminEndpoint('PUT', /^\/users\/\w+\//, ({ body }) => {
    if (!pinsIn(body)) {
      return body;
    }
    sent.push(body);
    return new Promise((resolve) => {
      // Echoed, unless answered with a response of its own
      waiting.push((response) => resolve(response ?? body));
    });
  });
  let answered = 0;
  const answer = async (response?: Response) => {
    // Saves are sent one after another, so the next only arrives once the last is answered
    await expect.poll(() => sent.length).toBeGreaterThan(answered);
    waiting[answered](response);
    answered += 1;
  };
  return {
    savedPins: () => (sent.length ? pinsIn(sent.at(-1)) : undefined),
    save: () => answer(),
    fail: () => answer(Response.json({ errors: [{ message: 'Failed' }] }, { status: 500 })),
  };
}

const listedApps = () =>
  appsScreen
    .sidebarAppItems()
    .elements()
    .map((element) => element.textContent?.trim());

describe('Apps in the sidebar', () => {
  afterEach(async () => {
    await page.viewport(1280, 800);
  });

  it('keeps the sidebar as it was without the apps flag', async () => {
    fakeTags([]);
    await renderAdminApp('/tags');

    await expect.element(page.getByTestId('admin-sidebar')).toBeVisible();
    await expect.element(appsScreen.eyebrow('Content')).not.toBeInTheDocument();
    await expect.element(appsScreen.sidebarApps()).not.toBeInTheDocument();
  });

  it('groups the sidebar under eyebrows, without Apps until something is installed', async () => {
    fakeTags([]);
    fakeInstallations();
    await renderAdminApp('/tags', { labs });

    await expect.element(appsScreen.eyebrow('Content')).toBeVisible();
    await expect.element(appsScreen.eyebrow('Audience')).toBeVisible();
    await expect.element(appsScreen.sidebarApps()).not.toBeInTheDocument();
  });

  it('pins the first three apps installed, and lists every app on the Apps page', async () => {
    fakeTags([]);
    fakeInstallations(FOUR_APPS);
    await renderAdminApp('/tags', withPins());

    await expect.element(appsScreen.sidebarLink()).toBeVisible();
    await expect.poll(listedApps).toEqual(['App 1', 'App 2', 'App 3']);

    await appsScreen.sidebarLink().click();
    await expect.poll(currentRoute).toBe('/apps');
    await expect.element(appsScreen.sidebarLink()).toHaveAttribute('aria-current', 'page');
    await expect.poll(listedApps).toEqual(['App 1', 'App 2', 'App 3', 'App 4']);
  });

  it('opens an app from the sidebar', async () => {
    fakeTags([]);
    fakeInstallations([installation()]);
    await fakeAppPage(installation());
    await renderAdminApp('/tags', withPins());

    await appsScreen.sidebarApp('Podcast').click();

    await expect.poll(currentRoute).toBe('/apps/installation-1');
    await expect.element(appsScreen.frame()).toBeVisible();
    await expect.element(appsScreen.sidebarApp('Podcast')).toHaveAttribute('aria-current', 'page');
  });

  it('leaves the app that was opened alone when an approval for the one before is refused late', async () => {
    const suspended = installation({ status: 'suspended', revision: 1 });
    fakeInstallations([suspended, app(2)]);
    await fakeAppPage(suspended);
    const otherSessions = fakeSessionStart('installation-2', app(2));
    let refuse!: () => void;
    const refusal = new Promise<void>((resolve) => {
      refuse = resolve;
    });
    let refused = false;
    const approveApi = fakeAdminEndpoint('PUT', '/apps/installations/installation-1/', async () => {
      await refusal;
      refused = true;
      return new Response(
        JSON.stringify({ errors: [{ message: 'Changed.', code: 'APP_INSTALLATION_CHANGED' }] }),
        { status: 409, headers: { 'content-type': 'application/json' } },
      );
    });
    await renderAdminApp(
      '/apps/installation-1',
      withPins({ pinned: ['installation-1', 'installation-2'], unpinned: [] }),
    );

    await appsScreen.approveChangesButton().click();
    await expect.poll(() => approveApi.requests.length).toBe(1);
    window.location.hash = '#/apps/installation-2';
    await expect.element(appsScreen.frame()).toBeVisible();
    refuse();
    await expect.poll(() => refused).toBe(true);
    // Nothing shows that a refusal was ignored, so give the page that asked time to act on it.
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    expect(otherSessions.requests).toHaveLength(1);
  });

  it('lists an open app that isn’t pinned while it’s open', async () => {
    fakeInstallations([app(2), installation()]);
    await fakeAppPage(installation());
    await renderAdminApp(
      '/apps/installation-1',
      withPins({ pinned: ['installation-2'], unpinned: ['installation-1'] }),
    );

    await expect.poll(listedApps).toEqual(['App 2', 'Podcast']);
    await expect.element(appsScreen.sidebarApp('Podcast')).toHaveAttribute('aria-current', 'page');
  });

  it('unpins an app from the sidebar, and pins it again from the Apps page', async () => {
    fakeTags([]);
    fakeInstallations([app(1), app(2)]);
    const preferences = fakePreferencesApi();
    await renderAdminApp('/tags', withPins());

    await appsScreen.sidebarApp('App 1').hover();
    await appsScreen.pinToggle('Unpin App 1 from the sidebar').click();

    await expect.poll(listedApps).toEqual(['App 2']);
    await expect
      .poll(preferences.savedPins)
      .toEqual({ pinned: ['installation-2'], unpinned: ['installation-1'] });

    await appsScreen.sidebarLink().click();
    await appsScreen.rowActions('App 1').click();
    await appsScreen.menuItem('Pin to sidebar').click();

    await expect
      .poll(preferences.savedPins)
      .toEqual({ pinned: ['installation-2', 'installation-1'], unpinned: [] });
    await page.getByTestId('admin-sidebar').getByRole('link', { name: 'Tags' }).click();
    await expect.poll(listedApps).toEqual(['App 2', 'App 1']);
  });

  it('unpins an app from its details, and pins it again', async () => {
    fakeInstallations([app(1), app(2)]);
    fakeAdminEndpoint('GET', readPath('installation-1'), () => ({ app_installations: [app(1)] }));
    const preferences = fakePreferencesApi();
    await renderAdminApp('/apps/details/installation-1', withPins());
    await expect.poll(listedApps).toEqual(['App 1', 'App 2']);

    await appsScreen.detailsActions().click();
    await appsScreen.menuItem('Unpin from sidebar').click();

    // The sidebar keeps listing the app whose details are open, now after the pinned ones.
    await expect.poll(listedApps).toEqual(['App 2', 'App 1']);
    await expect
      .poll(preferences.savedPins)
      .toEqual({ pinned: ['installation-2'], unpinned: ['installation-1'] });

    await appsScreen.detailsActions().click();
    await appsScreen.menuItem('Pin to sidebar').click();

    await expect
      .poll(preferences.savedPins)
      .toEqual({ pinned: ['installation-2', 'installation-1'], unpinned: [] });
  });

  it('won’t pin a fourth app from its details, and says why', async () => {
    fakeInstallations(FOUR_APPS);
    fakeAdminEndpoint('GET', readPath('installation-4'), () => ({ app_installations: [app(4)] }));
    const preferences = fakePreferencesApi();
    await renderAdminApp('/apps/details/installation-4', withPins());
    await expect.poll(listedApps).toEqual(['App 1', 'App 2', 'App 3', 'App 4']);

    await appsScreen.detailsActions().click();
    const pinItem = appsScreen.menuItem('Pin to sidebar');
    await expect.element(pinItem).toHaveAttribute('aria-disabled', 'true');
    await expect.element(pinItem).toHaveAccessibleDescription(PINS_FULL_HINT);
    await pinItem.click({ force: true });

    await expect.element(pinItem).toBeVisible();
    expect(preferences.savedPins()).toBeUndefined();
  });

  it('keeps changes made in quick succession, however their saves land', async () => {
    fakeInstallations(FOUR_APPS);
    const saves = holdPinSaves();
    await renderAdminApp('/apps', withPins());
    await expect.poll(listedApps).toEqual(['App 1', 'App 2', 'App 3', 'App 4']);

    await appsScreen.sidebarApp('App 1').hover();
    await appsScreen.pinToggle('Unpin App 1 from the sidebar').click();
    await appsScreen.sidebarApp('App 2').hover();
    await appsScreen.pinToggle('Unpin App 2 from the sidebar').click();
    await expect.poll(listedApps).toEqual(['App 3', 'App 1', 'App 2', 'App 4']);

    // The first save lands while the second is still on its way
    await saves.save();
    await expect.poll(listedApps).toEqual(['App 3', 'App 1', 'App 2', 'App 4']);
    await appsScreen.sidebarApp('App 4').hover();
    await appsScreen.pinToggle('Pin App 4 to the sidebar').click();
    await expect.poll(listedApps).toEqual(['App 3', 'App 4', 'App 1', 'App 2']);

    await saves.save();
    await saves.save();
    await expect.poll(saves.savedPins).toEqual({
      pinned: ['installation-3', 'installation-4'],
      unpinned: ['installation-1', 'installation-2'],
    });
    await expect.poll(listedApps).toEqual(['App 3', 'App 4', 'App 1', 'App 2']);
  });

  it('rolls back a change that didn’t save, even with another saved after it', async () => {
    fakeInstallations(FOUR_APPS);
    const saves = holdPinSaves();
    await renderAdminApp('/apps', withPins());
    await expect.poll(listedApps).toEqual(['App 1', 'App 2', 'App 3', 'App 4']);

    await appsScreen.sidebarApp('App 1').hover();
    await appsScreen.pinToggle('Unpin App 1 from the sidebar').click();
    await appsScreen.sidebarApp('App 2').hover();
    await appsScreen.pinToggle('Unpin App 2 from the sidebar').click();

    await saves.fail();
    await saves.save();

    await expect.poll(saves.savedPins).toEqual({
      pinned: ['installation-1', 'installation-3'],
      unpinned: ['installation-2', 'installation-4'],
    });
    await expect.poll(listedApps).toEqual(['App 1', 'App 3', 'App 2', 'App 4']);
  });

  it('won’t pin a fourth app, and says why', async () => {
    fakeInstallations(FOUR_APPS);
    fakePreferencesApi();
    await renderAdminApp('/apps', withPins());

    await appsScreen.rowActions('App 4').click();
    const pinItem = appsScreen.menuItem('Pin to sidebar');
    await expect.element(pinItem).toHaveAttribute('aria-disabled', 'true');
    await expect.element(pinItem).toHaveAccessibleDescription(PINS_FULL_HINT);
    // It stays open on the reason, and pins nothing
    await pinItem.click({ force: true });
    await expect.element(pinItem).toBeVisible();
    await userEvent.keyboard('{Escape}');

    const pin = appsScreen.pinToggle('Pin App 4 to the sidebar');
    await expect.element(pin).toHaveAttribute('aria-disabled', 'true');
    // Hidden until its row is hovered, like any other app's pin
    await appsScreen.sidebarLink().hover();
    await expect.poll(() => getComputedStyle(pin.element().parentElement!).opacity).toBe('0');
    await pin.hover();
    await expect.element(page.getByRole('tooltip')).toHaveTextContent('Only 3 apps fit');
    // Playwright won't click a disabled control unless forced
    await pin.click({ force: true });
    await expect.poll(listedApps).toEqual(['App 1', 'App 2', 'App 3', 'App 4']);
  });

  it('marks a suspended app, which opens its page like any other', async () => {
    fakeTags([]);
    fakeInstallations([installation({ status: 'suspended' })]);
    await renderAdminApp('/tags', withPins());

    await expect.element(appsScreen.sidebarNeedsApproval()).toBeVisible();
    await expect
      .element(appsScreen.sidebarApp('Podcast Needs approval'))
      .toHaveAttribute('href', '#/apps/installation-1');
  });

  it('drops an app from the sidebar once it’s uninstalled', async () => {
    const installations = fakeInstallations([app(1), app(2)]);
    fakeAdminEndpoint('DELETE', '/apps/installations/installation-1/', () => {
      installations.set([app(2)]);
      return new Response(null, { status: 204 });
    });
    await renderAdminApp('/apps', withPins());
    await expect.poll(listedApps).toEqual(['App 1', 'App 2']);

    await appsScreen.rowActions('App 1').click();
    await appsScreen.menuItem('Uninstall').click();
    await appsScreen.uninstallButton().click();

    await expect.poll(listedApps).toEqual(['App 2']);
  });

  it('lists pinned apps in the mobile menu', async () => {
    fakeTags([]);
    fakeInstallations([app(1)]);
    await page.viewport(390, 844);
    await renderAdminApp('/tags', withPins());

    await page.getByRole('button', { name: 'Toggle Sidebar' }).click();

    await expect.element(appsScreen.sidebarApp('App 1')).toBeVisible();
    await expect.element(appsScreen.pinToggle('Unpin App 1 from the sidebar')).toBeVisible();
  });
});
