import { deferred } from '@/utils/deferred';
import { afterEach, describe, expect, it } from 'vitest';
import type { StateBridge } from '@/ember-bridge';
import { page, userEvent } from 'vitest/browser';

import {
  activeThemeResponse,
  allowUnhandledRequests,
  currentRoute,
  fakeAdminEndpoint,
  fakeEndpoint,
  fakeTags,
  fakeComments,
  fakeAutomations,
  fakeNewsletters,
  fakeTiers,
  fakeAnalyticsOverview,
  fakeMembers,
  member,
  browseResponse,
  renderAdminApp,
  currentUserResponse,
  configResponse,
  staffRole,
  staffUser,
  fakeUsers,
  settingsResponse,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { sidebarScreen } from './sidebar.screen';

// The shell class is the rollout's eligibility boundary for layout and typography.
const hasPageChromeScope = () => document.querySelector('.admin7-page-chrome') !== null;

async function expectPageChromeScope(enabled: boolean, typographyEnabled = enabled): Promise<void> {
  await expect.poll(hasPageChromeScope).toBe(enabled);
  await expect
    .poll(() => document.querySelector('.admin7-typography') !== null)
    .toBe(typographyEnabled);
  await expect
    .poll(() =>
      getComputedStyle(sidebarScreen.shellMain().element()).fontFamily.includes('Inter Admin 7'),
    )
    .toBe(typographyEnabled);
}

async function expectAdminTypography(element: Element, enabled: boolean): Promise<void> {
  await expect
    .poll(() => getComputedStyle(element).fontFamily.includes('Inter Admin 7'))
    .toBe(enabled);
  const style = getComputedStyle(element);
  expect(style.fontVariationSettings).toBe(enabled ? '"opsz" 14' : 'normal');
  expect(style.fontFeatureSettings).toBe(enabled ? '"cv05", "dlig", "ss01", "zero"' : 'normal');
}

// Font rules are inspected here so browser tests use the shipped assets, not
// copies or a second font definition that could drift from production.
function pageChromeFontRules(): CSSFontFaceRule[] {
  return [...document.styleSheets].flatMap((sheet) => {
    // Third-party preview font stylesheets are cross-origin and unrelated.
    try {
      return [...sheet.cssRules].filter(
        (rule): rule is CSSFontFaceRule =>
          rule instanceof CSSFontFaceRule && rule.style.fontFamily.includes('Inter Admin 7'),
      );
    } catch {
      return [];
    }
  });
}

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
  it.each([
    { enabled: true, theme: 'light' },
    { enabled: false, theme: 'light' },
    { enabled: true, theme: 'dark' },
  ] as const)(
    'uses eligible typography in the portalled user menu ($enabled, $theme)',
    async ({ enabled, theme }) => {
      const me = currentUserResponse();
      me.users[0].accessibility = JSON.stringify({ nightShift: theme });
      await renderAdminApp('/site', {
        labs: { admin7PageChrome: enabled },
        boot: { browseMe: { response: me } },
      });

      await sidebarScreen.userMenuTrigger().click();

      await expect.element(sidebarScreen.profileMenuItem()).toBeVisible();
      await expect.element(sidebarScreen.appearanceMenuItem()).toBeVisible();
      await expect.element(sidebarScreen.signOutMenuItem()).toBeVisible();
      const hasTypography = enabled && theme === 'light';
      await expectAdminTypography(sidebarScreen.profileMenuItem().element(), hasTypography);
      expect(sidebarScreen.profileMenuItem().element().closest('#root')).toBeNull();
      await sidebarScreen.appearanceMenuItem().click();
      await expect.element(sidebarScreen.appearanceOption('light')).toBeVisible();
      await expectAdminTypography(sidebarScreen.appearanceOption('light').element(), hasTypography);
    },
  );

  it('removes portal typography when an open menu outlives editor route entry', async () => {
    await renderAdminApp('/posts', { labs: { admin7PageChrome: true } });
    await sidebarScreen.userMenuTrigger().click();
    await expect.element(sidebarScreen.profileMenuItem()).toBeVisible();
    const profile = sidebarScreen.profileMenuItem().element();
    await expectAdminTypography(profile, true);

    // The acceptance bridge leaves navigation mounted, exercising cleanup even
    // when a portal outlives the route whose typography originally enabled it.
    window.location.hash = '#/editor/post';
    await expect.poll(currentRoute).toBe('/editor/post');
    await expect.element(sidebarScreen.profileMenuItem()).toBeVisible();
    expect(profile.isConnected).toBe(true);
    await expectAdminTypography(profile, false);
  });

  it('updates mounted portal roots with theme changes without affecting other body roots', async () => {
    await renderAdminApp('/site', { labs: { admin7PageChrome: true } });
    await expectPageChromeScope(true);
    const portal = document.createElement('div');
    portal.className = 'shade shade-admin shade-activitypub';
    portal.innerHTML = '<div class="shade shade-admin"><input aria-label="Portal probe" /></div>';
    const standalone = document.createElement('div');
    standalone.className = 'shade';
    standalone.textContent = 'Standalone Shade';
    const preview = document.createElement('div');
    preview.textContent = 'Unrelated preview';
    const legacyHosts = [
      'ember-basic-dropdown-wormhole',
      'ember-modal-wormhole',
      'ember-liquid-wormhole',
    ].map((id) => {
      const host = document.createElement('div');
      host.id = id;
      host.innerHTML = '<input aria-label="Legacy Admin overlay" />';
      return host;
    });
    document.body.append(portal, standalone, preview, ...legacyHosts);
    try {
      const input = portal.querySelector('input')!;
      const legacyControls = legacyHosts.map((host) => host.querySelector('input')!);
      for (const element of [input, ...legacyControls]) {
        await expectAdminTypography(element, true);
      }
      expect(getComputedStyle(standalone).fontFamily).not.toContain('Inter Admin 7');
      expect(getComputedStyle(preview).fontFamily).not.toContain('Inter Admin 7');
      expect(getComputedStyle(document.body).fontFamily).not.toContain('Inter Admin 7');

      await sidebarScreen.selectAppearance('dark');
      for (const element of [input, ...legacyControls]) {
        await expectAdminTypography(element, false);
      }
      await sidebarScreen.selectAppearance('light');
      for (const element of [input, ...legacyControls]) {
        await expectAdminTypography(element, true);
      }
    } finally {
      portal.remove();
      standalone.remove();
      preview.remove();
      legacyHosts.forEach((host) => host.remove());
    }
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
    await expectPageChromeScope(enabled);
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
      await expectPageChromeScope(false);
    },
  );

  it('waits for config before mounting the shell, then activates without a reload', async () => {
    let releaseConfig: () => void = () => {};
    let configRequested = false;
    const gate = new Promise<void>((resolve) => {
      releaseConfig = resolve;
    });
    try {
      await renderAdminApp('/site', {
        boot: {
          browseConfig: {
            response: async () => {
              configRequested = true;
              await gate;
              return configResponse({ labs: { admin7PageChrome: true } });
            },
          },
        },
      });
      await expect.poll(() => configRequested).toBe(true);
      await expect.element(sidebarScreen.shellMain()).not.toBeInTheDocument();
      expect(hasPageChromeScope()).toBe(false);
      releaseConfig();
      await expectPageChromeScope(true);
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
      await expectPageChromeScope(role !== 'Contributor');
      if (role === 'Contributor') {
        await expect.element(sidebarScreen.shellNav()).not.toBeInTheDocument();
      }
    },
  );

  it('does not extend Settings typography to a contributor', async () => {
    allowUnhandledRequests();
    await renderAdminApp('/settings/staff', {
      labs: { admin7PageChrome: true },
      boot: {
        browseMe: {
          response: { users: [staffUser({ roles: [staffRole({ name: 'Contributor' })] })] },
        },
      },
    });
    await expect.element(sidebarScreen.shellMain()).toBeInTheDocument();
    await expectPageChromeScope(false);
  });

  it('does not use the saved sidebar collapse preference as route eligibility', async () => {
    const me = currentUserResponse();
    me.users[0].accessibility = JSON.stringify({
      navigation: { expanded: { posts: true, members: true }, menu: { visible: false } },
    });
    await renderAdminApp('/site', {
      labs: { admin7PageChrome: true },
      boot: { browseMe: { response: me } },
    });

    await expectPageChromeScope(true);
  });

  it('removes the scope in dark mode and restores it in light mode', async () => {
    await renderAdminApp('/site', { labs: { admin7PageChrome: true } });
    await expectPageChromeScope(true);

    await sidebarScreen.selectAppearance('dark');
    await expectPageChromeScope(false);
    await sidebarScreen.selectAppearance('light');
    await expectPageChromeScope(true);
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
    await expectPageChromeScope(true);
    try {
      await page.viewport(800, 800);
      await expectPageChromeScope(false);
      await page.viewport(801, 800);
      await expectPageChromeScope(true);
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('keeps typography but removes chrome in Settings and restores chrome on exit', async () => {
    // The settings app owns its request graph; this spec asserts only shell scope.
    allowUnhandledRequests();
    fakeTags([]);
    await renderAdminApp('/site', { labs: { admin7PageChrome: true } });
    await expectPageChromeScope(true);
    await sidebarScreen.navLink('Tags').click();
    await expect.poll(currentRoute).toBe('/tags');
    await expectPageChromeScope(true);
    await sidebarScreen.navLink('Settings').click();
    await expect.poll(currentRoute).toMatch(/^\/settings/);
    await expectPageChromeScope(false, true);

    window.location.hash = '#/posts';
    await expect.poll(currentRoute).toBe('/posts');
    await expectPageChromeScope(true);
  });

  it('excludes the automation editor before its route content loads', async () => {
    // The automation editor owns its request graph; this spec asserts only shell scope.
    allowUnhandledRequests();
    await renderAdminApp('/automations/new', {
      labs: { admin7PageChrome: true, automations: true },
    });
    await expect.element(sidebarScreen.shellMain()).toBeInTheDocument();
    await expectPageChromeScope(false);
    await expect.element(sidebarScreen.shellNav()).not.toBeInTheDocument();
  });

  it('excludes the Ember editor immediately on entry and restores the scope on exit', async () => {
    // No Ember bridge in this tier: its visibility deliberately remains true.
    await renderAdminApp('/posts', { labs: { admin7PageChrome: true } });
    await expectPageChromeScope(true);
    window.location.hash = '#/editor/post';
    await expect.poll(currentRoute).toBe('/editor/post');
    await expectPageChromeScope(false);
    window.location.hash = '#/posts';
    await expect.poll(currentRoute).toBe('/posts');
    await expectPageChromeScope(true);
  });
});

describe('Admin page chrome typography', () => {
  it('loads local normal and italic fonts and preserves component typography', async () => {
    await renderAdminApp('/site', { labs: { admin7PageChrome: true } });
    await expectPageChromeScope(true);

    const nav = sidebarScreen.navLink('Posts').element();
    const navStyle = getComputedStyle(nav);
    expect(navStyle.fontFamily).toContain('Inter Admin 7');
    expect(navStyle.fontFeatureSettings).toBe('"cv05", "dlig", "ss01", "zero"');
    expect(navStyle.fontVariationSettings).toBe('"opsz" 14');
    const componentTypography = {
      weight: navStyle.fontWeight,
      size: navStyle.fontSize,
      lineHeight: navStyle.lineHeight,
      casing: navStyle.textTransform,
    };
    expect(getComputedStyle(document.body).fontFamily).not.toContain('Inter Admin 7');

    // A small CSS fixture exercises inheritance and the same utilities used by
    // chrome components. No production-only markup is needed for a font sample.
    const sample = document.createElement('div');
    sample.innerHTML = `
      <span class="font-normal">0 1 2 3</span>
      <em class="font-semibold">Italic 0123</em>
      <span class="tabular-nums">111111</span>
      <span class="tabular-nums">888888</span>
      <code class="font-mono">const count = 123;</code>
    `;
    sidebarScreen.shellMain().element().append(sample);
    try {
      const [normal, italic, ones, eights, code] = [...sample.children];
      expect(getComputedStyle(normal).fontWeight).toBe('400');
      expect(getComputedStyle(italic).fontWeight).toBe('600');
      expect(getComputedStyle(italic).fontStyle).toBe('italic');
      expect(getComputedStyle(ones).fontVariantNumeric).toBe('tabular-nums');
      expect(getComputedStyle(code).fontFamily).not.toContain('Inter Admin 7');

      // Exercise extended Latin, Greek, Cyrillic, and Vietnamese characters
      // that a basic English sample would silently skip.
      const multilingual =
        'Hamburgefonts 0123 Árvíztűrő tükörfúrógép Tiếng Việt Ελληνικά ἀρχή Кириллица Ѣ';
      normal.textContent = multilingual;
      italic.textContent = multilingual;
      for (const style of ['normal 400', 'italic 600']) {
        const faces = await document.fonts.load(`${style} 14px "Inter Admin 7"`, multilingual);
        expect(faces).toHaveLength(1);
        expect(faces.every((face) => face.status === 'loaded')).toBe(true);
      }
      expect(ones.getBoundingClientRect().width).toBeCloseTo(
        eights.getBoundingClientRect().width,
        2,
      );

      await sidebarScreen.selectAppearance('dark');
      await expectPageChromeScope(false);
      const excludedStyle = getComputedStyle(nav);
      expect({
        weight: excludedStyle.fontWeight,
        size: excludedStyle.fontSize,
        lineHeight: excludedStyle.lineHeight,
        casing: excludedStyle.textTransform,
      }).toEqual(componentTypography);
      expect(excludedStyle.fontVariationSettings).toBe('normal');
      expect(excludedStyle.fontFeatureSettings).toBe('normal');
    } finally {
      sample.remove();
    }
  });

  it('keeps text visible with the existing font stack when the new font fails to load', async () => {
    await renderAdminApp('/site', { labs: { admin7PageChrome: true } });
    await expectPageChromeScope(true);

    const fontRules = pageChromeFontRules();
    expect(fontRules).toHaveLength(2);
    const sources = fontRules.map((rule) => rule.style.getPropertyValue('src'));
    const sample = document.createElement('span');
    sample.textContent = 'Posts 0123456789';
    sidebarScreen.shellMain().element().append(sample);
    try {
      // Corrupt only this family's sources, including already loaded faces, so
      // the browser exercises the actual CSS fallback rather than a mock font.
      for (const rule of fontRules) {
        expect(rule.style.getPropertyValue('font-display')).toBe('swap');
        rule.style.setProperty('src', 'url(data:font/woff2;base64,AA==) format("woff2")');
      }
      await expect(document.fonts.load('400 14px "Inter Admin 7"', 'Posts')).rejects.toThrow();
      await expect.element(sidebarScreen.navLink('Posts')).toBeVisible();
      const family = getComputedStyle(sample).fontFamily;
      expect(family).toContain('Inter,');
      const fallbackWidth = sample.getBoundingClientRect().width;
      expect(fallbackWidth).toBeGreaterThan(0);
      sample.style.fontFamily = family.replace(/"Inter Admin 7",\s*/, '');
      await document.fonts.ready;
      expect(sample.getBoundingClientRect().width).toBeCloseTo(fallbackWidth, 2);
    } finally {
      sample.remove();
      fontRules.forEach((rule, index) => rule.style.setProperty('src', sources[index]));
    }
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

// Full-app coverage for the first page to adopt the saved desktop sidebar.
describe('Members floating sidebar', () => {
  const toggle = (open: boolean) =>
    page.getByRole('button', { name: open ? 'Hide sidebar' : 'Show sidebar', exact: true });
  const layout = () => document.querySelector('.admin7-sidebar-layout') as HTMLElement;
  const panel = () => sidebarScreen.shellNav().element() as HTMLElement;
  const surface = () => panel().querySelector('[data-sidebar="sidebar"]') as HTMLElement;
  const content = () => document.querySelector('.admin7-page-content') as HTMLElement;
  const savedUser = (visible: boolean, nightShift = 'light') => {
    const me = currentUserResponse();
    me.users[0].accessibility = JSON.stringify({
      navigation: { expanded: { posts: false, members: true }, menu: { visible } },
      nightShift,
      customPreference: 'preserve me',
      whatsNew: { lastSeenDate: '2026-08-26T00:00:00.000Z' },
    });
    return me;
  };

  it.each([
    {
      name: 'saved closed, config last',
      waitFor: 'config',
      visible: false,
      enabled: true,
      theme: 'light',
      expected: 'collapsed',
    },
    {
      name: 'saved closed, user last',
      waitFor: 'user',
      visible: false,
      enabled: true,
      theme: 'light',
      expected: 'collapsed',
    },
    {
      name: 'saved open',
      waitFor: 'config',
      visible: true,
      enabled: true,
      theme: 'light',
      expected: 'expanded',
    },
    {
      name: 'default open',
      waitFor: 'config',
      visible: undefined,
      enabled: true,
      theme: 'light',
      expected: 'expanded',
    },
    {
      name: 'flag disabled',
      waitFor: 'config',
      visible: false,
      enabled: false,
      theme: 'light',
      expected: 'expanded',
    },
    {
      name: 'dark mode',
      waitFor: 'config',
      visible: false,
      enabled: true,
      theme: 'dark',
      expected: 'expanded',
    },
  ])(
    'resolves boot inputs before rendering the sidebar: $name',
    async ({ waitFor, visible, enabled, theme, expected }) => {
      fakeMembers([]);
      const me = savedUser(visible ?? true, theme);
      if (visible === undefined) {
        me.users[0].accessibility = '{}';
      }
      let releaseBoot!: () => void;
      const bootGate = new Promise<void>((resolve) => {
        releaseBoot = resolve;
      });
      let otherResponseServed = false;
      const states: string[] = [];
      const recordState = () => {
        const state = document
          .querySelector('[role="navigation"][data-state]')
          ?.getAttribute('data-state');
        if (state) {
          states.push(state);
        }
      };
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.target instanceof Element &&
            mutation.target.matches('[role="navigation"][data-state]') &&
            mutation.oldValue
          ) {
            states.push(mutation.oldValue);
          }
        }
        recordState();
      });
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['data-state'],
        attributeOldValue: true,
      });
      try {
        await renderAdminApp('/members', {
          labs: { admin7PageChrome: enabled },
          boot: {
            browseMe: {
              response: async () => {
                if (waitFor === 'user') {
                  await bootGate;
                } else {
                  otherResponseServed = true;
                }
                return me;
              },
            },
            browseConfig: {
              response: async () => {
                if (waitFor === 'config') {
                  await bootGate;
                } else {
                  otherResponseServed = true;
                }
                return configResponse({ labs: { admin7PageChrome: enabled } });
              },
            },
          },
        });
        await expect.poll(() => otherResponseServed).toBe(true);
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        expect(document.querySelector('[role="navigation"][data-state]')).toBeNull();
        releaseBoot();
        await expect
          .poll(() =>
            document.querySelector('[role="navigation"][data-state]')?.getAttribute('data-state'),
          )
          .toBe(expected);
        recordState();
        expect(states.length).toBeGreaterThan(0);
        expect(states.every((state) => state === expected)).toBe(true);
        if (enabled && theme === 'light') {
          expect(layout().dataset.sidebarMotion).toBe('snap');
          await expect
            .element(toggle(expected === 'expanded'))
            .toHaveAttribute('aria-disabled', 'false');
        } else {
          expect(document.querySelector('.admin7-sidebar-layout')).toBeNull();
        }
      } finally {
        releaseBoot();
        observer.disconnect();
      }
    },
  );

  it.each(['config', 'preferences'])(
    'still renders legacy navigation when initial %s fails',
    async (dependency) => {
      fakeMembers([]);
      const me = savedUser(false);
      if (dependency === 'preferences') {
        me.users[0].accessibility = '{invalid';
      }
      await renderAdminApp('/members', {
        labs: { admin7PageChrome: true },
        boot: {
          browseMe: { response: me },
          ...(dependency === 'config' && {
            browseConfig: {
              responseStatus: 400,
              response: { errors: [{ message: 'Config unavailable' }] },
            },
          }),
        },
      });
      await expect
        .poll(() =>
          document.querySelector('[role="navigation"][data-state]')?.getAttribute('data-state'),
        )
        .toBe('expanded');
      expect(document.querySelector('.admin7-sidebar-layout')).toBeNull();
    },
  );

  it('toggles a 300px floating panel, preserves preferences, and prevents hidden keyboard focus', async () => {
    fakeMembers([
      member({ name: 'A member with a very long name that should not widen the layout' }),
    ]);
    const writes: Array<{ users: Array<{ accessibility: string }> }> = [];
    const me = savedUser(true);
    await renderAdminApp('/members', {
      labs: { admin7PageChrome: true },
      boot: {
        browseMe: { response: me },
        editUserPreferences: {
          response: async (request: Request) => {
            const body = (await request.json()) as { users: Array<{ accessibility: string }> };
            writes.push(body);
            return { users: [{ ...me.users[0], ...body.users[0] }] };
          },
        },
      },
    });
    await expect.element(toggle(true)).toHaveAttribute('aria-disabled', 'false');
    const trigger = toggle(true).element();
    expect(trigger.getAttribute('aria-controls')).toBe(panel().parentElement?.id);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(surface().getBoundingClientRect().width).toBe(300);
    expect(surface().getBoundingClientRect().x).toBe(8);
    expect(surface().getBoundingClientRect().y).toBe(8);
    expect(getComputedStyle(surface()).boxShadow).toBe('none');
    expect(getComputedStyle(surface()).borderWidth).toBe('1px');
    expect(getComputedStyle(surface()).borderStyle).toBe('solid');
    expect(getComputedStyle(panel()).transitionDuration).toBe('0s');
    const cookies = document.cookie;
    await toggle(true).click();
    await expect.element(toggle(false)).toHaveAttribute('aria-disabled', 'false');
    expect(panel().inert).toBe(true);
    expect(panel().getAttribute('aria-hidden')).toBe('true');
    await expect
      .poll(() => Math.round(sidebarScreen.shellMain().element().getBoundingClientRect().x))
      .toBe(0);
    expect(document.cookie).toBe(cookies);
    expect(JSON.parse(writes[0].users[0].accessibility)).toMatchObject({
      navigation: { expanded: { posts: false, members: true }, menu: { visible: false } },
      customPreference: 'preserve me',
      nightShift: 'light',
    });
    await userEvent.tab({ shift: true });
    expect(panel().contains(document.activeElement)).toBe(false);
    toggle(false).element().focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(toggle(true)).toHaveAttribute('aria-disabled', 'false');
    expect(panel().inert).toBe(false);
    await expect
      .poll(() => Math.round(sidebarScreen.shellMain().element().getBoundingClientRect().x))
      .toBe(316);
    expect(JSON.parse(writes[1].users[0].accessibility)).toMatchObject({
      navigation: { menu: { visible: true } },
    });
    await userEvent.keyboard('{Control>}b{/Control}');
    await expect.element(toggle(true)).toHaveAttribute('aria-expanded', 'true');
    expect(writes).toHaveLength(2);
  });

  it('resolves a saved closed preference on direct loads, including import, without animation', async () => {
    fakeMembers([]);
    await renderAdminApp('/members/import', {
      labs: { admin7PageChrome: true },
      boot: { browseMe: { response: savedUser(false) } },
    });
    await expect.element(page.getByRole('dialog', { name: 'Import members' })).toBeVisible();
    expect(document.querySelector('[data-sidebar=trigger]')?.getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(layout().dataset.sidebarMotion).toBe('snap');
    expect(getComputedStyle(panel()).transitionDuration).toBe('0s');
    expect(panel().inert).toBe(true);
    expect(document.querySelector('main')?.getBoundingClientRect().x).toBe(0);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await toggle(false).click();
    await expect.element(toggle(true)).toHaveAttribute('aria-disabled', 'false');
  });

  it('rolls back a rejected save and offers a working retry', async () => {
    fakeMembers([]);
    await renderAdminApp('/members', {
      labs: { admin7PageChrome: true },
      boot: {
        browseMe: { response: savedUser(true) },
        editUserPreferences: {
          responseStatus: 400,
          response: { errors: [{ message: 'Rejected' }] },
        },
      },
    });
    await expect.element(toggle(true)).toHaveAttribute('aria-disabled', 'false');
    await toggle(true).click();
    await expect
      .element(sidebarScreen.errorToast())
      .toHaveTextContent("Couldn't save sidebar preference. Please try again.");
    await expect.element(toggle(true)).toHaveAttribute('aria-disabled', 'false');
    expect(panel().inert).toBe(false);
    expect(layout().dataset.sidebarMotion).toBe('snap');
    fakeAdminEndpoint('PUT', /^\/users\/\w+\/\?include=roles/, ({ body }) => body);
    await toggle(true).click();
    await expect.element(toggle(false)).toHaveAttribute('aria-disabled', 'false');
    expect(panel().inert).toBe(true);
  });

  it('keeps the optimistic control stable while a save is pending', async () => {
    fakeMembers([]);
    const me = savedUser(true);
    let releaseSave!: () => void;
    const saved = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    let writeCount = 0;
    await renderAdminApp('/members', {
      labs: { admin7PageChrome: true },
      boot: {
        browseMe: { response: me },
        editUserPreferences: {
          response: async (request: Request) => {
            writeCount += 1;
            const body = (await request.json()) as { users: Array<{ accessibility: string }> };
            await saved;
            return { users: [{ ...me.users[0], ...body.users[0] }] };
          },
        },
      },
    });
    await expect.element(toggle(true)).toHaveAttribute('aria-disabled', 'false');
    await toggle(true).click();
    await expect.element(toggle(false)).toHaveAttribute('aria-disabled', 'true');
    expect(getComputedStyle(panel()).transitionDuration).toBe(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '0s' : '0.52s',
    );
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      expect(getComputedStyle(panel()).transitionProperty).toBe('none');
    }
    expect(document.activeElement).toBe(toggle(false).element());
    await userEvent.keyboard('{Enter}');
    expect(panel().inert).toBe(true);
    expect(writeCount).toBe(1);
    releaseSave();
    await expect.element(toggle(false)).toHaveAttribute('aria-disabled', 'false');
    expect(document.activeElement).toBe(toggle(false).element());
    expect(writeCount).toBe(1);
  });

  it('uses 40px gutters and responsive caps without changing header type or spacing', async () => {
    fakeMembers([member()]);
    await renderAdminApp('/members', { labs: { admin7PageChrome: true } });
    await expect.element(toggle(true)).toHaveAttribute('aria-disabled', 'false');
    const header = document.querySelector('[data-list-page="header"]') as HTMLElement;
    const heading = page.getByRole('heading', { name: /^Members/ }).element();
    // Standalone acceptance uses a 16px rem; Ember's host uses 10px.
    expect(parseFloat(getComputedStyle(header).paddingTop)).toBe(
      parseFloat(getComputedStyle(document.documentElement).fontSize) * 2,
    );
    expect(parseFloat(getComputedStyle(heading).fontSize)).toBe(
      parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.5,
    );
    expect(parseFloat(getComputedStyle(heading).lineHeight)).toBe(
      parseFloat(getComputedStyle(document.documentElement).fontSize) * 2.25,
    );
    expect(getComputedStyle(header).paddingLeft).toBe('40px');
    expect(getComputedStyle(content()).maxWidth).toBe('1080px');
    await toggle(true).click();
    await expect.element(toggle(false)).toHaveAttribute('aria-disabled', 'false');
    await expect.poll(() => Math.round(content().getBoundingClientRect().width)).toBe(1080);
    try {
      await page.viewport(1600, 900);
      expect(getComputedStyle(content()).maxWidth).toBe('1280px');
      await expect.poll(() => Math.round(content().getBoundingClientRect().width)).toBe(1280);
      await expect.poll(() => layout().dataset.sidebarMotion).toBe('snap');
      expect(content().getBoundingClientRect().x).toBe(160);
      expect(panel().getAnimations()).toHaveLength(0);
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('retains the desktop choice through mobile and dark mode without hiding unintegrated navigation', async () => {
    fakeMembers([]);
    fakeTags([]);
    await renderAdminApp('/members', {
      labs: { admin7PageChrome: true },
      boot: { browseMe: { response: savedUser(false) } },
    });
    await expect.element(toggle(false)).toHaveAttribute('aria-disabled', 'false');
    try {
      await page.viewport(800, 800);
      await expect.element(toggle(false)).not.toBeInTheDocument();
      expect(layout()).toBeNull();
      await page.viewport(801, 800);
      await expect.element(toggle(false)).toHaveAttribute('aria-disabled', 'false');
      expect(layout().dataset.sidebarMotion).toBe('snap');
      await page.viewport(1280, 800);
      // Use navigation history rather than clicking the deliberately inert sidebar.
      window.location.hash = '#/site';
      await expect.element(sidebarScreen.navLink('Members')).toBeVisible();
      expect(layout()).toBeNull();
      await sidebarScreen.selectAppearance('dark');
      await sidebarScreen.navLink('Members').click();
      await expect.poll(() => document.documentElement.classList.contains('dark')).toBe(true);
      expect(layout()).toBeNull();
      await expect.element(sidebarScreen.navLink('Tags')).toBeVisible();
      await sidebarScreen.selectAppearance('light');
      await expect.element(toggle(false)).toHaveAttribute('aria-disabled', 'false');
      expect(layout().dataset.sidebarMotion).toBe('snap');
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('keeps a large count and actions separate at narrow desktop widths, with existing banners intact', async () => {
    fakeMembers([member({ name: 'A very long member name that remains within the table' })]);
    const response = browseResponse('members', [member()], { limit: 100 });
    response.meta.pagination.total = 1234567;
    fakeAdminEndpoint('GET', /^\/members\/\?.*limit=100/, response);
    await renderAdminApp('/members', {
      labs: { admin7PageChrome: true },
      boot: {
        browseMe: { response: savedUser(true) },
        browseActiveTheme: {
          response: activeThemeResponse({
            errors: [
              {
                code: 'GS001-DEPRECATED-HELPER',
                rule: 'Replace deprecated helper',
                details: 'A deprecated helper was found.',
                failures: [{ ref: 'index.hbs', message: 'Use the current helper.' }],
                fatal: false,
                level: 'error',
              },
            ],
          }),
        },
      },
    });
    await expect.element(toggle(true)).toHaveAttribute('aria-disabled', 'false');
    await expect.element(page.getByRole('heading', { name: 'Members 1,234,567' })).toBeVisible();
    await expect.element(sidebarScreen.themeErrorsBanner()).toBeVisible();
    try {
      for (const width of [801, 1024, 1280, 1440]) {
        await page.viewport(width, 900);
        await expect
          .poll(() => {
            const left = document
              .querySelector('[data-page-header="left"]')!
              .getBoundingClientRect();
            const actions = document
              .querySelector('[data-page-header="actions"]')!
              .getBoundingClientRect();
            const header = document
              .querySelector('[data-list-page="header"]')!
              .getBoundingClientRect();
            const body = document
              .querySelector('[data-testid="members-list-item"]')!
              .getBoundingClientRect();
            return {
              separate: left.right <= actions.left || left.bottom <= actions.top,
              insideHeader: actions.bottom <= header.bottom,
              afterHeader: body.top >= header.bottom,
            };
          })
          .toEqual({ separate: true, insideHeader: true, afterHeader: true });
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      }
      await toggle(true).click();
      await expect.element(toggle(false)).toHaveAttribute('aria-disabled', 'false');
      expect(panel().inert).toBe(true);
      await toggle(false).click();
      await expect.element(sidebarScreen.themeErrorsBanner()).toBeVisible();
      await sidebarScreen.themeErrorsBanner().click();
      await expect.element(sidebarScreen.themeErrorsDialog()).toBeVisible();
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('keeps content moving throughout the toggle without repeatedly measuring the page header', async () => {
    fakeMembers(
      Array.from({ length: 100 }, (_, index) => member({ name: `Measured member ${index}` })),
    );
    await renderAdminApp('/members?search=layout-measurements', {
      labs: { admin7PageChrome: true },
      boot: { browseMe: { response: savedUser(true) } },
    });
    await expect.element(toggle(true)).toHaveAttribute('aria-disabled', 'false');
    await expect
      .element(page.getByRole('link', { name: 'Measured member 0', exact: true }))
      .toBeVisible();
    await document.fonts.ready;
    const header = document.querySelector('[data-list-page="header"]') as HTMLElement;
    const sticky = page.getByTestId('members-list-scroll-root').element()
      .firstElementChild as HTMLElement;
    await expect
      .poll(() => parseFloat(sticky.style.getPropertyValue('--members-sticky-column-width')))
      .toBeGreaterThan(0);
    const measureHeader = header.getBoundingClientRect.bind(header);
    let headerReads = 0;
    header.getBoundingClientRect = () => {
      headerReads += 1;
      return measureHeader();
    };
    const gap = document.querySelector('[data-sidebar="gap"]') as HTMLElement;
    const completed: number[] = [];
    const cancelled: string[] = [];
    const onEnd = (event: TransitionEvent) => completed.push(event.elapsedTime);
    const onCancel = (event: TransitionEvent) => cancelled.push(event.propertyName);
    gap.addEventListener('transitionend', onEnd);
    gap.addEventListener('transitioncancel', onCancel);
    try {
      const main = sidebarScreen.shellMain().element();
      const initialWidth = main.getBoundingClientRect().width;
      await toggle(true).click();
      // The panel moves as a compositor transform; the page still genuinely
      // resizes between its endpoints instead of freezing until the end.
      expect(getComputedStyle(panel()).transitionProperty).toBe('transform');
      await expect
        .poll(() => {
          const width = main.getBoundingClientRect().width;
          return width > initialWidth && width < initialWidth + 316;
        })
        .toBe(true);
      await expect.poll(() => layout().dataset.sidebarMotion).toBe('snap');
      await toggle(false).click();
      await expect.poll(() => layout().dataset.sidebarMotion).toBe('snap');
      expect(cancelled).toEqual([]);
      expect(completed).toEqual([0.52, 0.52]);
      // ResizeObserver supplies the already-computed dimensions. This used to
      // force a header layout read on almost every opening animation frame.
      expect(headerReads).toBe(0);
    } finally {
      gap.removeEventListener('transitionend', onEnd);
      gap.removeEventListener('transitioncancel', onCancel);
      header.getBoundingClientRect = measureHeader;
    }
  });

  it('preserves scroll position, sticky headers, and import modal stacking while toggling', async () => {
    fakeMembers(Array.from({ length: 100 }, (_, index) => member({ name: `Member ${index}` })));
    // Give the history-scoped scroll cache its own entry, independent of earlier Members specs.
    await renderAdminApp('/members?search=scroll-preservation', {
      labs: { admin7PageChrome: true },
      boot: { browseMe: { response: savedUser(true) } },
    });
    await expect.element(toggle(true)).toHaveAttribute('aria-disabled', 'false');
    await expect.element(page.getByRole('link', { name: 'Member 0', exact: true })).toBeVisible();
    const scroll = sidebarScreen.shellMain().element();
    scroll.scrollTop = 350;
    await expect.poll(() => scroll.scrollTop).toBe(350);
    await expect
      .poll(
        () =>
          (window.history.state as { ghostVirtualListScrollPosition?: Record<string, number> })
            ?.ghostVirtualListScrollPosition?.['/members?search=scroll-preservation'],
      )
      .toBe(350);
    const header = document.querySelector('[data-list-page="header"]')!;
    await expect.poll(() => header.getBoundingClientRect().top).toBe(0);
    await toggle(true).click();
    await expect.element(toggle(false)).toHaveAttribute('aria-disabled', 'false');
    await expect.poll(() => Math.round(scroll.getBoundingClientRect().x)).toBe(0);
    await expect.poll(() => layout().dataset.sidebarMotion).toBe('snap');
    expect(scroll.scrollTop).toBe(350);
    expect(header.getBoundingClientRect().top).toBe(0);
    await toggle(false).click();
    await expect.element(toggle(true)).toHaveAttribute('aria-disabled', 'false');
    await expect.poll(() => Math.round(scroll.getBoundingClientRect().x)).toBe(316);
    await expect.poll(() => layout().dataset.sidebarMotion).toBe('snap');
    expect(scroll.scrollTop).toBe(350);
    expect(header.getBoundingClientRect().top).toBe(0);
    await page.getByTestId('members-actions').click();
    await page.getByRole('menuitem', { name: 'Import members', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Import members' });
    await expect.element(dialog).toBeVisible();
    const rect = dialog.element().getBoundingClientRect();
    expect(
      dialog
        .element()
        .contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)),
    ).toBe(true);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  });

  it.each(['loading', 'empty', 'error'] as const)(
    'keeps the toggle usable with a %s Members list',
    async (state) => {
      fakeMembers([]);
      let releaseMembers!: () => void;
      const responseReady = new Promise<void>((resolve) => {
        releaseMembers = resolve;
      });
      if (state !== 'empty') {
        fakeAdminEndpoint(
          'GET',
          /^\/members\/\?.*limit=100/,
          async () => {
            if (state === 'loading') {
              await responseReady;
            }
            return state === 'error'
              ? { errors: [{ message: 'Cannot load members' }] }
              : browseResponse('members', []);
          },
          { status: state === 'error' ? 400 : 200 },
        );
      }
      await renderAdminApp('/members', {
        labs: { admin7PageChrome: true },
        boot: { browseMe: { response: savedUser(false) } },
      });
      await expect.element(toggle(false)).toHaveAttribute('aria-disabled', 'false');
      if (state === 'error') {
        await expect
          .element(page.getByRole('heading', { name: 'Error loading members' }))
          .toBeVisible();
      }
      await toggle(false).click();
      await expect.element(toggle(true)).toHaveAttribute('aria-disabled', 'false');
      releaseMembers();
    },
  );
});

describe('React page chrome integration', () => {
  const toggle = () => page.getByRole('button', { name: /^(Show|Hide) sidebar$/ });
  const savedClosed = () => {
    const me = currentUserResponse();
    me.users[0].accessibility = JSON.stringify({
      navigation: { expanded: { posts: false, members: true }, menu: { visible: false } },
      whatsNew: { lastSeenDate: '2026-08-26T00:00:00.000Z' },
    });
    return me;
  };
  function seedPages() {
    fakeTags([]);
    fakeMembers([]);
    fakeComments([]);
    fakeAutomations([]);
    fakeNewsletters([]);
    fakeTiers([]);
    fakeAnalyticsOverview();
  }

  it.each(['/tags', '/comments', '/automations', '/members/new', '/tags/new', '/analytics'])(
    'keeps one working toggle and one content cap on %s',
    async (route) => {
      seedPages();
      await renderAdminApp(route, {
        labs: { admin7PageChrome: true, tagDetailsReact: true, automations: true },
        boot: { browseMe: { response: savedClosed() } },
      });
      await expect.element(toggle()).toHaveAttribute('aria-expanded', 'false');
      await expect(toggle()).toHaveCount(1);
      expect(document.querySelectorAll('.admin7-page-content')).toHaveLength(1);
      const content = document.querySelector('.admin7-page-content') as HTMLElement;
      expect(getComputedStyle(content).maxWidth).toBe('1080px');
      const gutter = content.querySelector(
        '[data-list-page="list-page"], [data-detail-page="detail-page"], .admin7-page-gutter',
      ) as HTMLElement;
      expect(getComputedStyle(gutter).paddingLeft).toBe('40px');
      expect(getComputedStyle(gutter).paddingRight).toBe('40px');
      expect(toggle().element().getBoundingClientRect().left).toBeCloseTo(
        content.getBoundingClientRect().left + 40,
        0,
      );
      await toggle().click();
      await expect.element(toggle()).toHaveAttribute('aria-expanded', 'true');
      await expect.element(toggle()).toHaveAttribute('aria-disabled', 'false');
      await expect
        .element(
          page.getByTestId('admin-sidebar').getByRole('link', { name: 'Members', exact: true }),
        )
        .toBeVisible();
      try {
        await page.viewport(801, 800);
        await expect.element(toggle()).toBeVisible();
        const header = toggle()
          .element()
          .closest('[data-page-header="main"], [data-header="header"]');
        expect(header?.getBoundingClientRect().right).toBeLessThanOrEqual(801);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(801);
        await page.viewport(1600, 1000);
        expect(getComputedStyle(content).maxWidth).toBe('1280px');
      } finally {
        await page.viewport(1280, 800);
      }
    },
  );

  it.each(['/tags', '/members/missing'])(
    'keeps the toggle while %s data is still loading',
    async (route) => {
      seedPages();
      const pending = deferred<unknown>();
      const path = route === '/tags' ? /^\/tags\// : /^\/members\/missing\//;
      const capture = fakeAdminEndpoint('GET', path, () => pending.promise);
      try {
        await renderAdminApp(route, {
          labs: { admin7PageChrome: true },
          boot: { browseMe: { response: savedClosed() } },
        });
        await expect.poll(() => capture.requests.length).toBeGreaterThan(0);
        await expect.element(toggle()).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle()).toHaveCount(1);
        await toggle().click();
        await expect
          .element(
            page.getByTestId('admin-sidebar').getByRole('link', { name: 'Members', exact: true }),
          )
          .toBeVisible();
      } finally {
        pending.resolve(route === '/tags' ? browseResponse('tags', []) : { members: [] });
      }
    },
  );

  it('preserves closed state through list/detail navigation and leaves Ember tag details open', async () => {
    seedPages();
    await renderAdminApp('/members', {
      labs: { admin7PageChrome: true },
      boot: { browseMe: { response: savedClosed() } },
    });
    await expect.element(toggle()).toHaveAttribute('aria-expanded', 'false');
    for (const route of ['/members/new', '/tags', '/comments', '/members']) {
      window.location.hash = `#${route}`;
      await expect.poll(currentRoute).toBe(route);
      await expect.element(toggle()).toHaveAttribute('aria-expanded', 'false');
      expect(
        document.querySelector('.admin7-sidebar-layout')?.getAttribute('data-sidebar-motion'),
      ).toBe('snap');
    }
    window.location.hash = '#/tags/legacy';
    await expect
      .element(
        page.getByTestId('admin-sidebar').getByRole('link', { name: 'Members', exact: true }),
      )
      .toBeVisible();
    await expect(toggle()).toHaveCount(0);
    expect(document.querySelector('.admin7-sidebar-layout')).toBeNull();
  });

  it.each(['member', 'tag'])('keeps a reopening control on a missing %s', async (kind) => {
    seedPages();
    const route = kind === 'member' ? '/members/missing' : '/tags/missing';
    const path = kind === 'member' ? /^\/members\/missing\// : /^\/tags\/slug\/missing\//;
    fakeAdminEndpoint(
      'GET',
      path,
      kind === 'member'
        ? { members: [] }
        : { errors: [{ message: 'Not found', type: 'NotFoundError' }] },
      { status: kind === 'member' ? 200 : 404 },
    );
    await renderAdminApp(route, {
      labs: { admin7PageChrome: true, tagDetailsReact: true },
      boot: { browseMe: { response: savedClosed() } },
    });
    await expect.element(toggle()).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle()).toHaveCount(1);
    await expect
      .element(
        page.getByText(kind === 'member' ? 'This member couldn’t be found.' : 'Page not found', {
          exact: true,
        }),
      )
      .toBeVisible();
  });
  it.each(['/automations', '/analytics'])(
    'retains the error boundary and reopen control after %s fails',
    async (route) => {
      seedPages();
      const boot = { browseMe: { response: savedClosed() } };
      if (route === '/automations') {
        fakeAdminEndpoint(
          'GET',
          /^\/automations\//,
          { errors: [{ message: 'Failed to load automations' }] },
          { status: 500 },
        );
      } else {
        fakeAdminEndpoint(
          'GET',
          /^\/site\//,
          { errors: [{ message: 'Failed to load site' }] },
          { status: 500 },
        );
      }
      // React's development error replay emits window errors even when the
      // router boundary catches them. Capture and assert only this expected API
      // failure; do not globally ignore browser errors for the suite.
      const renderErrors: string[] = [];
      const captureError = (event: ErrorEvent) => {
        const error: unknown = event.error;
        renderErrors.push(error instanceof Error ? error.message : event.message);
        event.preventDefault();
      };
      window.addEventListener('error', captureError);
      try {
        await renderAdminApp(route, { labs: { admin7PageChrome: true, automations: true }, boot });
        await expect
          .element(page.getByRole('heading', { name: 'Loading interrupted' }))
          .toBeVisible();
        await expect.element(toggle()).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle()).toHaveCount(1);
        await toggle().click();
        await expect
          .element(
            page.getByTestId('admin-sidebar').getByRole('link', { name: 'Members', exact: true }),
          )
          .toBeVisible();
      } finally {
        window.removeEventListener('error', captureError);
      }
      expect(renderErrors.length).toBeGreaterThan(0);
      expect(
        renderErrors.every((message) =>
          message.includes(route === '/automations' ? 'loading automations' : 'loading site'),
        ),
      ).toBe(true);
    },
  );
});

describe('Embedded Network page chrome', () => {
  const base = 'http://test.com/.ghost/activitypub/v1/';
  const toggle = () => page.getByRole('button', { name: /^(Show|Hide) sidebar$/ });
  function seedNetwork(onboarded = true) {
    fakeUnreadNotifications(0);
    fakeEndpoint('GET', `${base}topics`, { topics: [] });
    fakeEndpoint('GET', `${base}preferences`, {});
    fakeEndpoint('GET', 'http://test.com/.ghost/activitypub/users/index', {
      id: 'https://example.com/ap/me',
      preferredUsername: 'index',
      name: 'Network account',
    });
    fakeEndpoint('GET', `${base}posts/me`, { posts: [], next: null });
    fakeEndpoint('GET', `${base}recommendations`, { accounts: [] });
    fakeEndpoint('GET', `${base}feed/reader`, { posts: [], next: null });
    fakeEndpoint('GET', `${base}feed/notes`, { posts: [], next: null });
    fakeEndpoint('GET', `${base}account/me`, {
      id: 'me',
      apId: 'https://example.com/ap/me',
      name: 'Network account',
      handle: '@me@example.com',
      bio: '',
      url: 'https://example.com',
      avatarUrl: '',
      bannerImageUrl: null,
      customFields: {},
      attachment: [],
      postCount: 0,
      likedCount: 0,
      followingCount: 0,
      followerCount: 0,
      followsMe: false,
      followedByMe: false,
      blockedByMe: false,
      domainBlockedByMe: false,
    });
    fakeUsers([]);
    const me = currentUserResponse();
    me.users[0].accessibility = JSON.stringify({
      navigation: { expanded: { posts: false, members: true }, menu: { visible: false } },
      apOnboarding: { welcomeStepsFinished: onboarded },
      whatsNew: { lastSeenDate: '2026-08-26T00:00:00.000Z' },
    });
    return {
      labs: { admin7PageChrome: true },
      boot: { ...socialWebEnabled().boot, browseMe: { response: me } },
    };
  }

  it('keeps its own navigation and scroll root while the Admin sidebar is collapsed', async () => {
    await renderAdminApp('/activitypub/reader', seedNetwork());
    await expect.element(page.getByRole('heading', { name: 'Reader', exact: true })).toBeVisible();
    await expect.element(toggle()).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle()).toHaveCount(1);
    const scrollRoot = document.querySelector('[data-scrollable-container]') as HTMLElement;
    expect(getComputedStyle(scrollRoot).overflowY).toBe('auto');
    expect(document.querySelectorAll('.admin7-page-content')).toHaveLength(1);
    await page.getByRole('link', { name: 'Notes', exact: true }).click();
    await expect.poll(currentRoute).toBe('/activitypub/notes');
    await expect.element(toggle()).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle()).toHaveCount(1);
    await toggle().click();
    await expect
      .element(
        page.getByTestId('admin-sidebar').getByRole('link', { name: 'Members', exact: true }),
      )
      .toBeVisible();
    try {
      await page.viewport(800, 800);
      await expect(toggle()).toHaveCount(0);
      expect(document.querySelector('.admin7-page-content')).toBeNull();
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('hides the toggle where it would overlap Network profile content', async () => {
    await renderAdminApp('/activitypub/profile', seedNetwork());
    await expect(toggle()).toHaveCount(0);
    await expect
      .element(page.getByRole('heading', { name: 'Network account', exact: true }))
      .toBeVisible();
  });

  it('hides the toggle beside Network detail-page back buttons', async () => {
    const profileHandle = '@index@example.com';
    const noteId = 'https://example.com/.ghost/activitypub/note/1';
    const account = {
      id: 'me',
      apId: 'https://example.com/ap/me',
      name: 'Network account',
      handle: profileHandle,
      bio: '',
      url: 'https://example.com',
      avatarUrl: '',
      bannerImageUrl: null,
      customFields: {},
      attachment: [],
      postCount: 0,
      likedCount: 0,
      followingCount: 0,
      followerCount: 0,
      followsMe: false,
      followedByMe: false,
      blockedByMe: false,
      domainBlockedByMe: false,
    };
    fakeEndpoint('GET', `${base}account/${profileHandle}`, account);
    fakeEndpoint('GET', `${base}posts/${profileHandle}`, { posts: [], next: null });

    await renderAdminApp(`/activitypub/profile/${profileHandle}`, seedNetwork());
    await expect(toggle()).toHaveCount(0);
    await expect
      .element(page.getByRole('heading', { name: 'Network account', exact: true }))
      .toBeVisible();

    window.location.hash = `#/activitypub/notes/${encodeURIComponent(noteId)}`;
    await expect.poll(currentRoute).toBe(`/activitypub/notes/${encodeURIComponent(noteId)}`);
    await expect(toggle()).toHaveCount(0);
  });

  it('keeps a reopening control on Network onboarding', async () => {
    await renderAdminApp('/activitypub/welcome/1', seedNetwork(false));
    await expect.element(toggle()).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle()).toHaveCount(1);
    await expect
      .element(page.getByRole('heading', { name: 'Increase your reach, with the social web.' }))
      .toBeVisible();
  });

  it('keeps a reopening control on Network API errors', async () => {
    const options = seedNetwork();
    fakeEndpoint(
      'GET',
      `${base}feed/reader`,
      { message: 'Site missing', code: 'SITE_MISSING' },
      { status: 403 },
    );
    await renderAdminApp('/activitypub/reader', options);
    await expect
      .element(page.getByRole('heading', { name: 'Site not configured correctly' }))
      .toBeVisible();
    await expect.element(toggle()).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle()).toHaveCount(1);
    await toggle().click();
    await expect
      .element(
        page.getByTestId('admin-sidebar').getByRole('link', { name: 'Members', exact: true }),
      )
      .toBeVisible();
  });
});
