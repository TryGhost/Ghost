import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  allowUnhandledRequests,
  configResponse,
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeTags,
  renderAdminApp,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { sidebarScreen } from './sidebar.screen';

// The floating sidebar's closed circle is named after the site (the site fixture's title).
const SITE_TITLE = 'Test Site';

type SidebarMode = 'full' | 'compact';

/** admin7Design on, with the user's stored sidebar mode (none: the default). */
function floatingSidebar({ mode }: { mode?: SidebarMode } = {}): RenderAdminAppOptions {
  const me = currentUserResponse();
  if (mode) {
    me.users[0].accessibility = JSON.stringify({
      navigation: { expanded: { posts: true, members: true }, menu: { visible: true, mode } },
    });
  }
  return { labs: { admin7Design: true }, boot: { browseMe: { response: me } } };
}

/** Echoes preference writes, so they persist, and reads back the sidebar modes they saved. */
function fakePreferencesApi() {
  // Echo the PUT so the client's write persists (see boot.ts's editUserPreferences).
  const api = fakeAdminEndpoint('PUT', /^\/users\/\w+\//, ({ body }) => body);
  const savedModes = () =>
    api.requests.map(({ body }) => {
      const { users } = body as { users: Array<{ accessibility: string }> };
      const preferences = JSON.parse(users[0].accessibility) as {
        navigation?: { menu?: { mode?: SidebarMode } };
      };
      return preferences.navigation?.menu?.mode;
    });
  return { savedMode: () => savedModes().at(-1), savedModes };
}

// The mode is saved once the sidebar has finished pinning or unpinning.
const SAVE_TIMEOUT = { timeout: 3000 };

describe('Floating sidebar (admin7Design)', () => {
  it.each([
    { admin7Design: false, state: undefined },
    { admin7Design: true, state: 'pinned' },
  ])(
    'replaces the docked sidebar, pinned by default: admin7Design $admin7Design',
    async ({ admin7Design, state }) => {
      fakeTags([]);
      let releaseConfig = () => {};
      const configReleased = new Promise<void>((resolve) => {
        releaseConfig = resolve;
      });
      await renderAdminApp('/tags', {
        labs: { admin7Design },
        boot: {
          browseConfig: {
            response: async () => {
              await configReleased;
              return configResponse();
            },
          },
        },
      });

      // Both variants render Tags before the Labs config selects the floating sidebar.
      try {
        await expect.element(sidebarScreen.navLink('Tags')).toBeVisible();
      } finally {
        releaseConfig();
      }
      await expect.poll(sidebarScreen.floatingState).toBe(state);
    },
  );

  it.each([
    {
      gesture: 'the pin button',
      unpin: async () => {
        // Hover intent arms once the pointer has been outside the sidebar
        await userEvent.hover(sidebarScreen.shellMain());
        await userEvent.hover(sidebarScreen.shellNav());
        await sidebarScreen.unpinButton().click();
      },
    },
    {
      gesture: '⌘B',
      unpin: () => userEvent.keyboard('{Control>}b{/Control}'),
    },
  ])('unpins into the closed circle with $gesture and saves the mode', async ({ unpin }) => {
    fakeTags([]);
    const preferences = fakePreferencesApi();
    await renderAdminApp('/tags', floatingSidebar());
    await expect.element(sidebarScreen.navLink('Tags')).toBeVisible();

    await unpin();
    // Unpinned under the pointer, the panel stays open until it leaves
    await userEvent.hover(sidebarScreen.shellMain());

    await expect.poll(sidebarScreen.floatingState).toBe('closed');
    await expect.element(sidebarScreen.floatingTrigger(SITE_TITLE)).toBeVisible();
    await expect.poll(preferences.savedMode, SAVE_TIMEOUT).toBe('compact');
  });

  it('pins the open panel with its pin button and saves the mode', async () => {
    fakeTags([]);
    const preferences = fakePreferencesApi();
    await renderAdminApp('/tags', floatingSidebar({ mode: 'compact' }));

    await sidebarScreen.floatingTrigger(SITE_TITLE).click();
    await sidebarScreen.pinButton().click();

    await expect.poll(sidebarScreen.floatingState).toBe('pinned');
    await expect.poll(preferences.savedMode, SAVE_TIMEOUT).toBe('full');
  });

  it('opens the closed circle on focus or click and closes it with Escape', async () => {
    fakeTags([]);
    await renderAdminApp('/tags', floatingSidebar({ mode: 'compact' }));
    const trigger = sidebarScreen.floatingTrigger(SITE_TITLE);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');

    // The skip link comes first in the tab order, then the circle
    await userEvent.tab();
    await userEvent.tab();
    await expect.element(trigger).toHaveFocus();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect.element(sidebarScreen.navLink('Tags')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    await expect.poll(sidebarScreen.floatingState).toBe('closed');
  });

  it('lists Ghost(Pro) with Settings and moves Help to the user menu', async () => {
    fakeTags([]);
    const config = configResponse({ labs: { admin7Design: true } });
    config.config.hostSettings = { billing: { enabled: true, url: 'https://billing.example.com' } };
    const options = floatingSidebar();
    await renderAdminApp('/tags', {
      ...options,
      boot: { ...options.boot, browseConfig: { response: config } },
    });

    await expect.element(sidebarScreen.ghostProLink()).toBeVisible();
    await expect.element(sidebarScreen.navLink('Settings')).toBeVisible();
    await expect.element(sidebarScreen.navLink('Help')).not.toBeInTheDocument();

    await sidebarScreen.userMenuTrigger().click();
    await expect.element(sidebarScreen.helpMenuItem()).toBeVisible();
  });

  it('shows Settings navigation in the same sidebar, pinned without saving the mode', async () => {
    // The settings app owns its request graph; this spec asserts only the shell navigation.
    allowUnhandledRequests();
    fakeTags([]);
    const preferences = fakePreferencesApi();
    await renderAdminApp('/tags', floatingSidebar({ mode: 'compact' }));

    await sidebarScreen.floatingTrigger(SITE_TITLE).click();
    await sidebarScreen.navLink('Settings').click();

    await expect.poll(currentRoute).toMatch(/^\/settings/);
    const backToApp = sidebarScreen.shellNav().getByRole('button', { name: 'Back to app' });
    await expect.element(backToApp).toBeVisible();
    expect(sidebarScreen.floatingState()).toBe('pinned');

    await backToApp.click();
    await userEvent.hover(sidebarScreen.shellMain());

    await expect.poll(currentRoute).toBe('/tags');
    await expect.poll(sidebarScreen.floatingState).toBe('closed');
    // Other preferences can save meanwhile; the stored mode stays as it was
    expect(preferences.savedModes()).not.toContain('full');
  });
});
