import {
  type AdminRouteHandle,
  type RouteObject,
  Outlet,
  lazyComponent,
  matchRoutes,
  redirect,
  useLocation,
} from '@tryghost/admin-x-framework';

// ActivityPub
import { FeatureFlagsProvider, routes as activityPubRoutes } from '@tryghost/activitypub/api';

// Stats (aka analytics)
import { AnalyticsProvider, analyticsRouteChildren } from './analytics/api';
import MyProfileRedirect from './my-profile-redirect';

import { BillingRoute, ForceUpgradeGuard } from './billing/api';
import HomeRedirect from './home-redirect';
import { lazyEditorScreen, lazyRestoreScreen } from './editor/api';
import { type AccessRouteHandle } from './route-access';
import { RouteAccessGuard } from './route-access-guard';
import { canManageApps, lazyAppInstallScreen, lazyAppsScreen } from './apps/api';
import { lazyAutomationEditorScreen, lazyAutomationsScreen } from './automations/api';
import { lazyCommentsScreen } from './comments/api';
import { lazyMigrateScreen } from './migrate/api';
import { lazyMemberActivityScreen, membersRouteChildren } from './members/api';
import { OnboardingRedirect, lazyOnboardingScreen } from './onboarding/api';
import {
  lazyPagesListRoute,
  lazyPostAnalyticsRoot,
  lazyPostDebugScreen,
  lazyPostsListRoute,
  postAnalyticsRouteChildren,
} from './posts/api';
import { canAccessSettingsRoute, SettingsRoute, settingsRouteChildren } from './settings/api';
import { lazyTagDetailScreen, lazyTagsScreen } from './tags/api';
import { lazyViewSiteScreen } from './view-site/api';
import {
  canManageAutomations,
  canManageMembers,
  canManageTags,
  hasAdminAccess,
} from '@tryghost/admin-x-framework/api/users';

import { NotFound } from './shared/not-found';
import { authRoutes } from './auth/api';

const appRoutes: RouteObject[] = [
  {
    // Role-based landing dispatch, including the hosted-signup
    // `/?firstStart=true` onboarding entry.
    path: '/',
    Component: HomeRedirect,
    handle: { allowInForceUpgrade: true } satisfies AdminRouteHandle,
  },
  {
    // The dashboard screen is retired; the URL redirects for old links.
    path: 'dashboard',
    loader: () => redirect('/analytics'),
  },
  {
    path: '/tags',
    handle: { requiresAccess: canManageTags } satisfies AccessRouteHandle,
    lazy: lazyComponent(lazyTagsScreen),
  },
  {
    path: '/comments',
    handle: { requiresAccess: canManageMembers } satisfies AccessRouteHandle,
    lazy: lazyComponent(lazyCommentsScreen),
  },
  {
    path: '/automations',
    handle: { requiresAccess: canManageAutomations } satisfies AccessRouteHandle,
    lazy: lazyComponent(lazyAutomationsScreen),
  },
  {
    path: '/apps',
    handle: { requiresAccess: canManageApps } satisfies AccessRouteHandle,
    lazy: lazyComponent(lazyAppsScreen),
  },
  {
    // The install link: `#/apps/install?manifest=<url>` opens the install flow.
    // Open to all staff, so those who can't install are told who can, not redirected.
    path: '/apps/install',
    lazy: lazyComponent(lazyAppInstallScreen),
  },
  {
    // The automation editor hides the admin sidebar for a focused,
    // full-screen editing surface.
    path: '/automations/:id',
    handle: {
      hideAdminSidebar: true,
      screenTransition: true,
      requiresAccess: canManageAutomations,
    } satisfies AdminRouteHandle & AccessRouteHandle,
    lazy: lazyComponent(lazyAutomationEditorScreen),
  },
  {
    // Covers both edit (`:tagSlug`) and create (the sentinel `new`) —
    // Ember's router declared `/tags/new` before `/tags/:tag_slug`, so a
    // tag with the literal slug "new" was already unreachable.
    path: '/tags/:tagSlug',
    handle: { requiresAccess: canManageTags } satisfies AccessRouteHandle,
    lazy: lazyComponent(lazyTagDetailScreen),
  },
  {
    path: '/members',
    handle: { requiresAccess: canManageMembers } satisfies AccessRouteHandle,
    children: membersRouteChildren,
  },
  {
    path: '/members-activity',
    handle: { requiresAccess: canManageMembers } satisfies AccessRouteHandle,
    lazy: lazyComponent(lazyMemberActivityScreen),
  },
  {
    path: '/posts/analytics/:postId/debug',
    lazy: lazyComponent(lazyPostDebugScreen),
  },
  {
    path: '/posts/analytics/:postId',
    lazy: lazyPostAnalyticsRoot,
    children: postAnalyticsRouteChildren,
  },
  {
    // Analytics routes folded directly into the shell table. The
    // AnalyticsProvider is attached to this route node (via its
    // element) rather than a separate wrapper subtree; OnboardingRedirect
    // still gates entry.
    path: 'analytics',
    element: (
      <OnboardingRedirect>
        <AnalyticsProvider>
          <Outlet />
        </AnalyticsProvider>
      </OnboardingRedirect>
    ),
    children: analyticsRouteChildren,
  },
  {
    path: 'setup/onboarding',
    lazy: lazyComponent(lazyOnboardingScreen),
  },
  {
    path: `network`,
    loader: () => redirect('/activitypub'),
  },
  {
    path: 'my-profile',
    Component: MyProfileRedirect,
    handle: { allowInForceUpgrade: true } satisfies AdminRouteHandle,
  },
  {
    path: '',
    element: (
      <FeatureFlagsProvider>
        <Outlet />
      </FeatureFlagsProvider>
    ),
    children: activityPubRoutes,
  },
  {
    // The shell swaps its primary navigation for Settings on desktop before
    // the lazy settings chunk has resolved. Mobile keeps its full takeover.
    path: `settings`,
    Component: SettingsRoute,
    children: settingsRouteChildren,
    handle: {
      allowInForceUpgrade: true,
      screenTransition: true,
      settingsSidebar: true,
      requiresAccess: canAccessSettingsRoute,
    } satisfies AdminRouteHandle & AccessRouteHandle,
  },
  { path: '/posts', lazy: lazyComponent(lazyPostsListRoute) },
  { path: '/pages', lazy: lazyComponent(lazyPagesListRoute) },
  {
    // The editor is a focused writing surface and hides the nav sidebar.
    path: '/editor/*',
    lazy: lazyComponent(lazyEditorScreen),
    handle: { hideAdminSidebar: true, screenTransition: true } satisfies AdminRouteHandle,
  },
  { path: '/site', lazy: lazyComponent(lazyViewSiteScreen) },
  { path: '/restore', lazy: lazyComponent(lazyRestoreScreen) },
  {
    path: '/migrate/*',
    lazy: lazyComponent(lazyMigrateScreen),
    handle: {
      hideAdminSidebar: true,
      requiresAccess: hasAdminAccess,
    } satisfies AdminRouteHandle & AccessRouteHandle,
  },
  {
    // The billing app itself stays mounted across routes (see BillingFrame),
    // so this route only decides access. Reachable in force upgrade: it is
    // the way out of it.
    path: '/pro/*',
    Component: BillingRoute,
    handle: { allowInForceUpgrade: true } satisfies AdminRouteHandle,
  },
  {
    // 404 catch-all
    path: '*',
    Component: NotFound,
  },
];

export const routes: RouteObject[] = [
  // Outside the guards: signed-out visitors have no user or settings to check.
  ...authRoutes,
  {
    // ForceUpgradeGuard wraps all routes to redirect to /pro when in force upgrade mode.
    // Routes with handle.allowInForceUpgrade: true bypass this protection.
    element: <ForceUpgradeGuard />,
    children: [
      {
        // RouteAccessGuard redirects to the default view on routes whose
        // handle.requiresAccess rule the current user's role fails.
        element: <RouteAccessGuard />,
        children: appRoutes,
      },
    ],
  },
];

// matchRoutes flattens and ranks the whole tree on every call, and every link
// asks (AdminLink, the screen-transition check), so a screen full of links
// re-matched the tree many times per render. The tree is static, so a path's
// matches never change; the cap only bounds paths carrying ids or slugs.
const MATCH_CACHE_LIMIT = 500;
const matchCache = new Map<string, ReturnType<typeof matchRoutes<RouteObject>>>();

/** `matchRoutes(routes, pathname)`, memoized per path. Callers must not mutate the result. */
export function matchAdminRoutes(pathname: string): ReturnType<typeof matchRoutes<RouteObject>> {
  let matches = matchCache.get(pathname);
  if (matches === undefined) {
    if (matchCache.size >= MATCH_CACHE_LIMIT) {
      matchCache.clear();
    }
    matches = matchRoutes(routes, pathname);
    matchCache.set(pathname, matches);
  }
  return matches;
}

/** The matched route's path pattern, e.g. `/tags/:tagSlug`, never the path's own ids or slugs. */
function matchedRoutePattern(pathname: string): string {
  let pattern = '';
  for (const { route } of matchAdminRoutes(pathname) ?? []) {
    if (route.path) {
      // An absolute child path already repeats its parents' paths
      pattern = route.path.startsWith('/') ? route.path : `${pattern}/${route.path}`;
    }
  }
  return pattern.replace(/\/\/+/g, '/') || '/';
}

/** The route pattern showing. */
export function useRoutePattern(): string {
  const { pathname } = useLocation();
  return matchedRoutePattern(pathname);
}
