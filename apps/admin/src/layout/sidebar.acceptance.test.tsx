import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import type { StateBridge } from '@/ember-bridge';

import {
  activeThemeResponse,
  allowUnhandledRequests,
  configResponse,
  currentRoute,
  fakeAdminEndpoint,
  fakeEndpoint,
  fakeTags,
  renderAdminApp,
  currentUserResponse,
  settingsResponse,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { sidebarScreen } from './sidebar.screen';

// The site fixture's URL roots the ActivityPub API (see use-activity-pub-queries.ts).
const UNREAD_COUNT_URL = 'http://test.com/.ghost/activitypub/v1/notifications/unread/count';

function socialWebEnabled(): RenderAdminAppOptions {
  return {
    boot: {
      browseSettings: { response: settingsResponse({ settings: { social_web_enabled: true } }) },
    },
  };
}

function fakeUnreadNotifications(count: number): void {
  fakeAdminEndpoint('GET', '/identities/', { identities: [{ token: 'test-token' }] });
  fakeEndpoint('GET', UNREAD_COUNT_URL, { count });
}

function installStaleEmberRoute(activeRoute: 'members-activity' | 'pages' | 'posts'): void {
  window.EmberBridge = {
    state: {
      onUpdate: () => {},
      onInvalidate: () => {},
      onDelete: () => {},
      isFeatureEnabled: () => false,
      on: () => {},
      off: () => {},
      sidebarVisible: true,
      getRouteUrl: (routeName) => routeName,
      isRouteActive: (routeNames) => {
        const routes = Array.isArray(routeNames) ? routeNames : routeNames.split(' ');
        return routes.includes(activeRoute);
      },
    } satisfies StateBridge,
  };
}

afterEach(async () => {
  delete window.EmberBridge;
  document.querySelector('[data-test-view-site-preview-styles]')?.remove();
  await page.viewport(1280, 720);
});

describe('Sidebar navigation', () => {
  it('keeps the shell hidden until Admin 7 eligibility is known', async () => {
    fakeTags([]);
    let resolveConfig!: (value: ReturnType<typeof configResponse>) => void;
    const pendingConfig = new Promise<ReturnType<typeof configResponse>>((resolve) => {
      resolveConfig = resolve;
    });

    await renderAdminApp('/tags', {
      boot: { browseConfig: { response: () => pendingConfig } },
    });

    const getShell = () =>
      document.querySelector('[data-sidebar="sidebar"]')?.closest('.group\\/sidebar-wrapper');
    await expect.poll(getShell).toBeTruthy();
    const shell = getShell()!;
    expect(shell).toHaveClass('invisible');

    resolveConfig(configResponse({ labs: { admin7PageChrome: true } }));
    await expect.poll(() => shell?.classList.contains('invisible')).toBe(false);
    expect(shell).toHaveClass('admin7');
  });

  it('shows the existing shell when Admin 7 config cannot be loaded', async () => {
    fakeTags([]);
    await renderAdminApp('/tags', {
      boot: {
        browseConfig: {
          response: { errors: [{ message: 'Config unavailable' }] },
          responseStatus: 400,
        },
      },
    });

    const getShell = () =>
      document
        .querySelector('[data-sidebar="sidebar"]')
        ?.closest('[class~="group/sidebar-wrapper"]');
    await expect.poll(getShell).toBeTruthy();
    await expect.poll(() => getShell()?.classList.contains('invisible')).toBe(false);
    expect(getShell()).not.toHaveClass('admin7');
  });

  it('uses default preferences when accessibility JSON is malformed', async () => {
    fakeTags([]);
    const me = currentUserResponse();
    me.users[0].accessibility = '{invalid json';

    await renderAdminApp('/tags', {
      labs: { admin7PageChrome: true },
      boot: { browseMe: { response: me } },
    });

    const getShell = () =>
      document
        .querySelector('[data-sidebar="sidebar"]')
        ?.closest('[class~="group/sidebar-wrapper"]');
    await expect.poll(getShell).toBeTruthy();
    await expect.poll(() => getShell()?.classList.contains('invisible')).toBe(false);
    expect(getShell()).toHaveClass('admin7');
  });

  it('uses the static Admin 7 shell without reading the saved menu visibility', async () => {
    fakeTags([]);
    const me = currentUserResponse();
    me.users[0].accessibility = JSON.stringify({
      navigation: { expanded: { posts: true, members: true }, menu: { visible: false } },
      nightShift: 'light',
    });

    await renderAdminApp('/tags', {
      labs: { admin7PageChrome: true },
      boot: { browseMe: { response: me } },
    });

    await expect.element(sidebarScreen.shellNav()).toBeVisible();
    await expect.poll(() => document.querySelector('.admin7')).not.toBeNull();
    const tagsPage = page.getByTestId('tags-page').element();
    const pageContainer = tagsPage.parentElement!;
    const pageHeader = tagsPage.querySelector('[data-list-page="header"]')!;
    expect(getComputedStyle(pageContainer).maxWidth).toBe('1080px');
    expect(getComputedStyle(tagsPage).paddingLeft).toBe('40px');
    expect(getComputedStyle(pageHeader).paddingTop).toBe('28px');

    const legacyPage = document.createElement('div');
    legacyPage.className = 'gh-canvas';
    const legacyHeader = document.createElement('div');
    legacyHeader.className = 'gh-canvas-header';
    legacyPage.appendChild(legacyHeader);
    tagsPage.closest('main')!.appendChild(legacyPage);
    expect(getComputedStyle(legacyPage).maxWidth).toBe('1080px');
    expect(getComputedStyle(legacyPage).paddingLeft).toBe('40px');
    expect(getComputedStyle(legacyHeader).paddingLeft).toBe('40px');
    expect(getComputedStyle(legacyHeader).paddingTop).toBe('28px');

    const networkHeader = document.createElement('div');
    networkHeader.dataset.networkHeader = 'header';
    tagsPage.closest('main')!.appendChild(networkHeader);
    expect(getComputedStyle(networkHeader).paddingTop).toBe('8px');

    const errorSurface = document.createElement('div');
    errorSurface.className = 'admin-x-container-error';
    const backgroundReference = document.createElement('div');
    backgroundReference.className = 'bg-background';
    tagsPage.closest('main')!.append(errorSurface, backgroundReference);
    expect(getComputedStyle(errorSurface).backgroundColor).toBe(
      getComputedStyle(backgroundReference).backgroundColor,
    );

    expect(document.querySelector('[data-sidebar="sidebar"]')).not.toBeNull();
    expect(document.querySelector('[data-sidebar="sidebar"]')?.parentElement).toHaveClass('p-2');
    const shell = document.querySelector<HTMLElement>('[class~="group/sidebar-wrapper"]')!;
    const sidebarSlot = document.querySelector<HTMLElement>('[data-sidebar="sidebar"]')!
      .parentElement!.previousElementSibling as HTMLElement;
    expect(getComputedStyle(shell).getPropertyValue('--sidebar-width')).toBe('316px');
    expect(sidebarSlot.getBoundingClientRect().width).toBe(316);
    expect(document.querySelector('[data-state="collapsed"]')).toBeNull();
    expect(document.querySelector('[aria-label="Hide sidebar"]')).toBeNull();
  });

  it('applies Admin 7 typography to legacy alert and notification portals', async () => {
    fakeTags([]);
    await renderAdminApp('/tags', { labs: { admin7PageChrome: true } });
    await expect.poll(() => document.querySelector('.admin7')).not.toBeNull();

    const shell = document.querySelector<HTMLElement>('.admin7')!;
    const createdHosts: HTMLElement[] = [];
    const hosts = ['ember-alerts-wormhole', 'ember-notifications-wormhole'].map((id) => {
      const existing = document.getElementById(id);
      if (existing) {
        return existing;
      }
      const host = document.createElement('div');
      host.id = id;
      document.body.appendChild(host);
      createdHosts.push(host);
      return host;
    });

    try {
      for (const host of hosts) {
        expect(getComputedStyle(host).fontFamily).toBe(getComputedStyle(shell).fontFamily);
        expect(getComputedStyle(host).fontFeatureSettings).toBe(
          getComputedStyle(shell).fontFeatureSettings,
        );
      }
    } finally {
      createdHosts.forEach((host) => host.remove());
    }
  });

  it('keeps the boot loader visible until React commits its mount marker', async () => {
    await renderAdminApp('/site');

    const marker = document.querySelector<HTMLElement>('[data-react-admin-mounted]')!;
    const emberApp = document.getElementById('ember-app')!;
    const bridgeHost = emberApp.parentElement!;

    try {
      document.body.appendChild(emberApp);
      expect(getComputedStyle(emberApp).visibility).toBe('hidden');
      marker.removeAttribute('data-react-admin-mounted');
      expect(getComputedStyle(emberApp).visibility).toBe('visible');
    } finally {
      marker.setAttribute('data-react-admin-mounted', '');
      bridgeHost.appendChild(emberApp);
    }
  });

  it('keeps the existing sidebar treatment when Admin 7 page chrome is disabled', async () => {
    fakeTags([]);
    await renderAdminApp('/tags', { labs: { admin7PageChrome: false } });

    await expect.element(sidebarScreen.shellNav()).toBeVisible();
    expect(document.querySelector('.admin7')).toBeNull();
  });

  it('gives the View site preview the floating sidebar bezel on desktop only', async () => {
    await page.viewport(1280, 800);
    await renderAdminApp('/site', { labs: { admin7PageChrome: true } });
    await expect.poll(() => document.querySelector('.admin7')).not.toBeNull();

    const legacyStyles = document.createElement('style');
    legacyStyles.dataset.testViewSitePreviewStyles = '';
    legacyStyles.textContent = `
      .site-frame {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: none;
      }
    `;
    document.head.appendChild(legacyStyles);

    const preview = document.createElement('iframe');
    preview.className = 'site-frame';
    preview.dataset.viewSitePreview = '';
    document.querySelector('.admin7 main > main')!.appendChild(preview);

    const sidebar = document.querySelector<HTMLElement>('[data-sidebar="sidebar"]')!;
    const desktopPreviewStyle = getComputedStyle(preview);
    const sidebarStyle = getComputedStyle(sidebar);
    const sidebarGutter = getComputedStyle(sidebar.parentElement!).paddingTop;

    expect(desktopPreviewStyle.top).toBe(sidebarGutter);
    expect(desktopPreviewStyle.right).toBe(sidebarGutter);
    expect(desktopPreviewStyle.left).toBe('0px');
    expect(desktopPreviewStyle.borderRadius).toBe(sidebarStyle.borderRadius);
    expect(desktopPreviewStyle.borderTopColor).toBe(sidebarStyle.borderTopColor);
    expect(desktopPreviewStyle.borderTopStyle).toBe('solid');

    await page.viewport(800, 800);
    await expect.poll(() => document.querySelector('.admin7')).toBeNull();

    const mobilePreviewStyle = getComputedStyle(preview);
    expect(mobilePreviewStyle.inset).toBe('0px');
    expect(parseFloat(mobilePreviewStyle.width)).toBe(window.innerWidth);
    expect(parseFloat(mobilePreviewStyle.height)).toBe(window.innerHeight);
    expect(mobilePreviewStyle.borderTopStyle).toBe('none');
    expect(mobilePreviewStyle.borderRadius).toBe('0px');
  });

  it('renders the navigation for the current user', async () => {
    await renderAdminApp('/site');

    await expect.element(sidebarScreen.navLink('Analytics')).toBeVisible();
    await expect.element(sidebarScreen.navLink('View site')).toBeVisible();
    await expect.element(sidebarScreen.navLink('Posts')).toBeVisible();
    await expect.element(sidebarScreen.navLink('Pages')).toBeVisible();
    await expect.element(sidebarScreen.navLink('Tags')).toBeVisible();
    await expect.element(sidebarScreen.navLink('Members')).toBeVisible();
    await expect.element(sidebarScreen.navLink('Settings')).toBeVisible();
    await expect.element(sidebarScreen.userMenuTrigger()).toBeVisible();
    // The Network item requires the social_web_enabled setting, off by default.
    await expect.element(sidebarScreen.navLink('Network')).not.toBeInTheDocument();
  });

  it('clicking a nav item navigates and updates the active state', async () => {
    fakeTags([]);
    await renderAdminApp('/site');

    await sidebarScreen.navLink('Tags').click();
    await expect.poll(currentRoute).toBe('/tags');
    await expect.element(sidebarScreen.navLink('Tags')).toHaveAttribute('aria-current', 'page');

    await sidebarScreen.navLink('View site').click();
    await expect.poll(currentRoute).toBe('/site');
    await expect
      .element(sidebarScreen.navLink('View site'))
      .toHaveAttribute('aria-current', 'page');
    await expect.element(sidebarScreen.navLink('Tags')).not.toHaveAttribute('aria-current');
  });

  it('uses router navigation for React-owned routes and hash anchors for Ember-owned ones', async () => {
    fakeTags([]);
    await renderAdminApp('/site');

    // Router links carry the router's history state (the unsaved-changes
    // blockers rely on it); Ember's router only follows hashchange, so its
    // links must stay native anchors.
    await sidebarScreen.navLink('Tags').click();
    await expect.poll(currentRoute).toBe('/tags');
    expect(typeof (window.history.state as { key?: unknown } | null)?.key).toBe('string');

    await sidebarScreen.navLink('Posts').click();
    await expect.poll(currentRoute).toBe('/posts');
    expect((window.history.state as { key?: unknown } | null)?.key).toBeUndefined();
  });

  it('clicking Posts and Pages navigates to the Ember-owned lists', async () => {
    // Posts/Pages active states come from the Ember routing bridge, absent in this tier.
    await renderAdminApp('/site');

    await sidebarScreen.navLink('Posts').click();
    await expect.poll(currentRoute).toBe('/posts');

    await sidebarScreen.navLink('Pages').click();
    await expect.poll(currentRoute).toBe('/pages');
  });

  it.each([
    { label: 'Posts', route: '/posts', emberRoute: 'posts' },
    { label: 'Pages', route: '/pages', emberRoute: 'pages' },
    { label: 'Members', route: '/members-activity', emberRoute: 'members-activity' },
  ] as const)(
    'clears the $label active state after leaving its Ember route',
    async ({ label, route, emberRoute }) => {
      fakeTags([]);
      installStaleEmberRoute(emberRoute);
      await renderAdminApp(route);

      await expect.element(sidebarScreen.navLink(label)).toHaveAttribute('aria-current', 'page');

      await sidebarScreen.navLink('Tags').click();
      await expect.poll(currentRoute).toBe('/tags');
      await expect.element(sidebarScreen.navLink(label)).not.toHaveAttribute('aria-current');
    },
  );

  it('shows the default post views and collapses them with the toggle', async () => {
    await renderAdminApp('/posts');

    await expect.element(sidebarScreen.postsToggle()).toHaveAttribute('aria-expanded', 'true');
    await expect.element(sidebarScreen.navLink('Drafts')).toBeVisible();
    await expect.element(sidebarScreen.navLink('Scheduled')).toBeVisible();
    await expect.element(sidebarScreen.navLink('Published')).toBeVisible();

    await sidebarScreen.postsToggle().click();

    await expect.element(sidebarScreen.postsToggle()).toHaveAttribute('aria-expanded', 'false');
    await expect.element(sidebarScreen.navLink('Drafts')).not.toBeInTheDocument();
  });

  it('clicking a posts submenu item navigates to the filtered list', async () => {
    // The submenu item's active state comes from the Ember routing bridge, absent in this tier.
    await renderAdminApp('/posts');

    await sidebarScreen.navLink('Scheduled').click();

    await expect.poll(currentRoute).toBe('/posts?type=scheduled');
  });

  it('navigates to settings from the sidebar footer and hides the shell nav', async () => {
    // The settings app owns its request graph; this spec asserts only the shell navigation.
    allowUnhandledRequests();
    await renderAdminApp('/site');

    await expect.element(sidebarScreen.shellNav()).toBeVisible();
    await sidebarScreen.navLink('Settings').click();

    await expect.poll(currentRoute).toMatch(/^\/settings/);
    await expect.element(sidebarScreen.shellNav()).not.toBeInTheDocument();
  });

  it('hides the shell nav when a settings route is loaded directly', async () => {
    // The settings app owns its request graph; this spec asserts only the shell navigation.
    allowUnhandledRequests();
    await renderAdminApp('/settings/staff');

    await expect.poll(currentRoute).toMatch(/^\/settings\/staff/);
    // The shell mounts only once the current user resolves — wait for it, or a
    // sidebar that appears on that later paint slips past the assertion.
    await expect.element(sidebarScreen.shellMain()).toBeInTheDocument();
    await expect.element(sidebarScreen.shellNav()).not.toBeInTheDocument();
  });
});

describe('Sidebar user menu', () => {
  it('opens the user menu with profile, appearance and sign-out items', async () => {
    await renderAdminApp('/site');

    await sidebarScreen.userMenuTrigger().click();

    await expect.element(sidebarScreen.profileMenuItem()).toBeVisible();
    await expect.element(sidebarScreen.appearanceMenuItem()).toBeVisible();
    await expect.element(sidebarScreen.signOutMenuItem()).toBeVisible();
  });

  it('navigates to the profile settings from the user menu', async () => {
    // The settings app owns its request graph; this spec asserts only the shell navigation.
    allowUnhandledRequests();
    await renderAdminApp('/site');

    await sidebarScreen.userMenuTrigger().click();
    await sidebarScreen.profileMenuItem().click();

    await expect.poll(currentRoute).toMatch(/^\/settings\/staff\//);
  });

  it('signs out through the session API and surfaces a failed sign-out', async () => {
    // Success intentionally navigates to /ghost/ after the session is
    // deleted; an error response keeps the page alive for assertions.
    const api = fakeAdminEndpoint(
      'DELETE',
      '/session/',
      { errors: [{ message: 'stop after request' }] },
      { status: 400 },
    );
    await renderAdminApp('/site');

    await sidebarScreen.userMenuTrigger().click();
    await sidebarScreen.signOutMenuItem().click();

    await expect.poll(() => api.requests.length).toBe(1);
    await expect
      .element(sidebarScreen.errorToast())
      .toHaveTextContent("Couldn't sign out. Please try again.");
  });

  it('switches the appearance and shows the current choice', async () => {
    // Without the Ember bridge the app itself toggles the root dark class.
    const isDarkMode = () => document.documentElement.classList.contains('dark');
    await renderAdminApp('/site');

    await sidebarScreen.selectAppearance('dark');
    await expect.poll(isDarkMode).toBe(true);

    await sidebarScreen.userMenuTrigger().click();
    await expect.element(sidebarScreen.appearanceMenuItem()).toHaveTextContent('Dark');
    await sidebarScreen.appearanceMenuItem().click();
    await sidebarScreen.appearanceOption('light').click();
    await expect.poll(isDarkMode).toBe(false);

    await sidebarScreen.userMenuTrigger().click();
    await expect.element(sidebarScreen.appearanceMenuItem()).toHaveTextContent('Light');
    await sidebarScreen.appearanceMenuItem().click();
    await sidebarScreen.appearanceOption('system').click();
    await expect.poll(isDarkMode).toBe(false);

    await sidebarScreen.userMenuTrigger().click();
    await expect.element(sidebarScreen.appearanceMenuItem()).toHaveTextContent('System');
  });
});

describe('Network notification badge', () => {
  it('shows the unread notifications count on the Network nav item', async () => {
    fakeUnreadNotifications(5);
    await renderAdminApp('/site', socialWebEnabled());

    await expect.element(sidebarScreen.navLink('Network')).toBeVisible();
    await expect.element(sidebarScreen.networkBadge()).toHaveTextContent('5');
  });

  it('does not show a badge when there are no unread notifications', async () => {
    fakeUnreadNotifications(0);
    await renderAdminApp('/site', socialWebEnabled());

    await expect.element(sidebarScreen.navLink('Network')).toBeVisible();
    await expect.element(sidebarScreen.networkBadge()).not.toBeInTheDocument();
  });

  it('hides the badge on the network route and restores it after navigating away', async () => {
    // The ActivityPub app owns its request graph; this spec asserts only the shell badge.
    allowUnhandledRequests();
    fakeUnreadNotifications(5);
    fakeAdminEndpoint('GET', '/users/?limit=100&include=roles', currentUserResponse());
    await renderAdminApp('/site', socialWebEnabled());

    await expect.element(sidebarScreen.networkBadge()).toBeVisible();

    await sidebarScreen.navLink('Network').click();
    await expect.poll(currentRoute).toBe('/activitypub/welcome/1');
    await expect.element(sidebarScreen.networkBadge()).not.toBeInTheDocument();

    await sidebarScreen.navLink('Posts').click();
    await expect.poll(currentRoute).toBe('/posts');
    await expect.element(sidebarScreen.networkBadge()).toBeVisible();
  });
});

describe('Theme error notification', () => {
  const DEPRECATED_HELPER_ERROR = {
    code: 'GS001-DEPR-PURL',
    rule: 'Replace deprecated helper',
    details: 'The <code>{{pageUrl}}</code> helper has been deprecated.',
    failures: [{ ref: 'default.hbs', message: 'deprecated usage' }],
    fatal: false,
    level: 'error',
  };

  // Surfaced inline in the design settings panel instead of the sidebar banner.
  const PAGE_BUILDER_ERROR = {
    code: 'GS110-NO-MISSING-PAGE-BUILDER-USAGE',
    rule: 'Check page builder usage',
    details: 'Missing page builder helper usage.',
    failures: [{ ref: 'post.hbs', message: 'show_title_and_feature_image' }],
    fatal: false,
    level: 'error',
  };

  it('shows a banner when the active theme has errors', async () => {
    await renderAdminApp('/site', {
      boot: {
        browseActiveTheme: { response: activeThemeResponse({ errors: [DEPRECATED_HELPER_ERROR] }) },
      },
    });

    await expect.element(sidebarScreen.themeErrorsBanner()).toBeVisible();
  });

  it('opens the theme errors dialog when the banner is clicked', async () => {
    await renderAdminApp('/site', {
      boot: {
        browseActiveTheme: { response: activeThemeResponse({ errors: [DEPRECATED_HELPER_ERROR] }) },
      },
    });

    await sidebarScreen.themeErrorsBanner().click();

    await expect.element(sidebarScreen.themeErrorsDialog()).toBeVisible();
    await expect
      .element(sidebarScreen.themeErrorsDialog())
      .toHaveTextContent('Replace deprecated helper');
  });

  it('shows no banner when the active theme has no errors', async () => {
    // The default boot serves an error-free active theme.
    await renderAdminApp('/site');

    await expect.element(sidebarScreen.userMenuTrigger()).toBeVisible();
    await expect.element(sidebarScreen.themeErrorsBanner()).not.toBeInTheDocument();
  });

  it('does not show a banner for page-builder errors handled inline in design settings', async () => {
    await renderAdminApp('/site', {
      boot: {
        browseActiveTheme: { response: activeThemeResponse({ errors: [PAGE_BUILDER_ERROR] }) },
      },
    });

    await expect.element(sidebarScreen.userMenuTrigger()).toBeVisible();
    await expect.element(sidebarScreen.themeErrorsBanner()).not.toBeInTheDocument();
  });
});
