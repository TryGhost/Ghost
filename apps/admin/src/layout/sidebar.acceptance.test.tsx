import { afterEach, describe, expect, it } from 'vitest';
import type { StateBridge } from '@/ember-bridge';
import { page } from 'vitest/browser';

import {
  activeThemeResponse,
  allowUnhandledRequests,
  currentRoute,
  fakeAdminEndpoint,
  fakeEndpoint,
  fakeTags,
  renderAdminApp,
  currentUserResponse,
  configResponse,
  staffRole,
  staffUser,
  settingsResponse,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { sidebarScreen } from './sidebar.screen';

// The scope class is this rollout's integration contract, not visible UI.
const hasPageChromeScope = () => document.querySelector('.admin7-page-chrome') !== null;

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

afterEach(() => {
  delete window.EmberBridge;
});

describe('Sidebar navigation', () => {
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

describe('Admin page chrome boundary', () => {
  it.each([true, false])('uses the server-computed flag (%s)', async (enabled) => {
    // Deliberately disagree: the shell must read config, not the stored setting.
    await renderAdminApp('/site', {
      labs: { admin7PageChrome: !enabled },
      boot: { browseConfig: { response: configResponse({ labs: { admin7PageChrome: enabled } }) } },
    });

    await expect.element(sidebarScreen.shellNav()).toBeVisible();
    await expect.poll(hasPageChromeScope).toBe(enabled);
  });

  it.each(['flag', 'labs'] as const)(
    'stays off when an older backend omits %s',
    async (missing) => {
      const response = configResponse();
      if (missing === 'labs') {
        delete response.config.labs;
      } else {
        delete response.config.labs?.admin7PageChrome;
      }
      await renderAdminApp('/site', {
        boot: { browseConfig: { response } },
      });

      await expect.element(sidebarScreen.shellNav()).toBeVisible();
      expect(hasPageChromeScope()).toBe(false);
    },
  );

  it('stays off while config is loading, then activates without a reload', async () => {
    let releaseConfig: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseConfig = resolve;
    });
    try {
      await renderAdminApp('/site', {
        boot: {
          browseConfig: {
            response: async () => {
              await gate;
              return configResponse({ labs: { admin7PageChrome: true } });
            },
          },
        },
      });
      await expect.element(sidebarScreen.shellMain()).toBeInTheDocument();
      expect(hasPageChromeScope()).toBe(false);
      releaseConfig();
      await expect.poll(hasPageChromeScope).toBe(true);
    } finally {
      releaseConfig();
    }
  });

  it.each(['Owner', 'Administrator', 'Editor', 'Super Editor', 'Author', 'Contributor'] as const)(
    'respects the %s navigation experience',
    async (role) => {
      await renderAdminApp('/posts', {
        labs: { admin7PageChrome: true },
        boot: {
          browseMe: { response: { users: [staffUser({ roles: [staffRole({ name: role })] })] } },
        },
      });

      await expect.element(sidebarScreen.shellMain()).toBeInTheDocument();
      await expect.poll(hasPageChromeScope).toBe(role !== 'Contributor');
      if (role === 'Contributor') {
        await expect.element(sidebarScreen.shellNav()).not.toBeInTheDocument();
      }
    },
  );

  it('does not use the saved sidebar collapse preference as route eligibility', async () => {
    const me = currentUserResponse();
    me.users[0].accessibility = JSON.stringify({
      navigation: { expanded: { posts: true, members: true }, menu: { visible: false } },
    });
    await renderAdminApp('/site', {
      labs: { admin7PageChrome: true },
      boot: { browseMe: { response: me } },
    });

    await expect.poll(hasPageChromeScope).toBe(true);
  });

  it('removes the scope in dark mode and restores it in light mode', async () => {
    await renderAdminApp('/site', { labs: { admin7PageChrome: true } });
    await expect.poll(hasPageChromeScope).toBe(true);

    await sidebarScreen.selectAppearance('dark');
    await expect.poll(hasPageChromeScope).toBe(false);
    await sidebarScreen.selectAppearance('light');
    await expect.poll(hasPageChromeScope).toBe(true);
  });

  it('never activates for an initially dark user while preferences load', async () => {
    const me = currentUserResponse();
    me.users[0].accessibility = JSON.stringify({ nightShift: 'dark' });
    let scopeWasAdded = false;
    const observer = new MutationObserver((mutations) => {
      scopeWasAdded ||=
        hasPageChromeScope() ||
        mutations.some(
          (mutation) =>
            mutation.type === 'attributes' && mutation.oldValue?.includes('admin7-page-chrome'),
        );
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
    });
    try {
      await renderAdminApp('/site', {
        labs: { admin7PageChrome: true },
        boot: { browseMe: { response: me } },
      });
      await expect.element(sidebarScreen.shellNav()).toBeVisible();
      await expect.poll(() => document.documentElement.classList.contains('dark')).toBe(true);
      expect(hasPageChromeScope()).toBe(false);
      expect(scopeWasAdded).toBe(false);
    } finally {
      observer.disconnect();
    }
  });

  it('tracks the existing desktop breakpoint in both directions', async () => {
    await renderAdminApp('/site', { labs: { admin7PageChrome: true } });
    await expect.poll(hasPageChromeScope).toBe(true);
    try {
      await page.viewport(800, 800);
      await expect.poll(hasPageChromeScope).toBe(false);
      await page.viewport(801, 800);
      await expect.poll(hasPageChromeScope).toBe(true);
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('removes the scope in Settings and restores it on return to an eligible route', async () => {
    // The settings app owns its request graph; this spec asserts only shell scope.
    allowUnhandledRequests();
    fakeTags([]);
    await renderAdminApp('/site', { labs: { admin7PageChrome: true } });
    await expect.poll(hasPageChromeScope).toBe(true);
    await sidebarScreen.navLink('Tags').click();
    await expect.poll(currentRoute).toBe('/tags');
    await expect.poll(hasPageChromeScope).toBe(true);
    await sidebarScreen.navLink('Settings').click();
    await expect.poll(currentRoute).toMatch(/^\/settings/);
    await expect.poll(hasPageChromeScope).toBe(false);

    window.location.hash = '#/posts';
    await expect.poll(currentRoute).toBe('/posts');
    await expect.poll(hasPageChromeScope).toBe(true);
  });

  it('excludes the automation editor before its route content loads', async () => {
    // The automation editor owns its request graph; this spec asserts only shell scope.
    allowUnhandledRequests();
    await renderAdminApp('/automations/new', {
      labs: { admin7PageChrome: true, automations: true },
    });
    await expect.element(sidebarScreen.shellMain()).toBeInTheDocument();
    expect(hasPageChromeScope()).toBe(false);
    await expect.element(sidebarScreen.shellNav()).not.toBeInTheDocument();
  });

  it('excludes the Ember editor immediately on entry and restores the scope on exit', async () => {
    // No Ember bridge in this tier: its visibility deliberately remains true.
    await renderAdminApp('/posts', { labs: { admin7PageChrome: true } });
    await expect.poll(hasPageChromeScope).toBe(true);
    window.location.hash = '#/editor/post';
    await expect.poll(currentRoute).toBe('/editor/post');
    await expect.poll(hasPageChromeScope).toBe(false);
    window.location.hash = '#/posts';
    await expect.poll(currentRoute).toBe('/posts');
    await expect.poll(hasPageChromeScope).toBe(true);
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
