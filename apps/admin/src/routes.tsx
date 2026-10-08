import { useCallback, useEffect } from 'react';
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

// Ember
import { syncEmberRoutePattern } from './ember-bridge';
import { BillingRoute, ForceUpgradeGuard } from './billing/api';
import HomeRedirect from './home-redirect';
import { EditorGate } from './editor-gate';
import { lazyRestoreScreen } from './editor/api';
import { useFlagGatedRouteOwner } from './use-flag-gated-route-owner';
import { type AccessRouteHandle } from './route-access';
import { RouteAccessGuard } from './route-access-guard';
import { canManageApps, lazyAppInstallScreen, lazyAppsScreen } from './apps/api';
import {
  lazyAutomationEditorScreen,
  lazyAutomationsScreen,
  lazyProtoExploration2Detail,
  lazyProtoExploration2List,
  lazyProtoPhase1Detail,
  lazyProtoPhase1List,
  lazyProtoPhase2Detail,
  lazyProtoPhase2List,
  lazyProtoPhase3Detail,
  lazyProtoPhase3List,
} from './automations/api';
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
import { canAccessSettingsRoute, lazySettingsScreen, settingsRouteChildren } from './settings/api';
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
      requiresAccess: canManageAutomations,
    } satisfies AdminRouteHandle & AccessRouteHandle,
    lazy: lazyComponent(lazyAutomationEditorScreen),
  },
  // Automations prototype — one route per LANE (see automations/proto/shared/
  // lanes). Each lane owns its own copy of the screens, so an engineer can be
  // sent a URL that is theirs and does not move when another lane changes.
  // Same access rule as the real automations routes.
  //
  // The detail routes hide the admin sidebar: the canvas wants the full screen.
  //
  // '/automations-proto/float' was the single route these replaced; it redirects
  // so links already shared out — preview environments, Linear, Slack — still
  // land somewhere. (A second concept, "surface", lived here until its variants
  // were decided; it's in the branch history if it's ever wanted back.)
  {
    path: '/automations-proto/float/*',
    loader: () => redirect('/automations-proto/phase-1'),
  },
  {
    path: '/automations-proto/phase-1',
    handle: { requiresAccess: canManageAutomations } satisfies AccessRouteHandle,
    lazy: lazyComponent(() => lazyProtoPhase1List()),
  },
  {
    path: '/automations-proto/phase-1/:id',
    handle: {
      hideAdminSidebar: true,
      requiresAccess: canManageAutomations,
    } satisfies AdminRouteHandle & AccessRouteHandle,
    lazy: lazyComponent(() => lazyProtoPhase1Detail()),
  },
  {
    path: '/automations-proto/phase-2',
    handle: { requiresAccess: canManageAutomations } satisfies AccessRouteHandle,
    lazy: lazyComponent(() => lazyProtoPhase2List()),
  },
  {
    path: '/automations-proto/phase-2/:id',
    handle: {
      hideAdminSidebar: true,
      requiresAccess: canManageAutomations,
    } satisfies AdminRouteHandle & AccessRouteHandle,
    lazy: lazyComponent(() => lazyProtoPhase2Detail()),
  },
  {
    path: '/automations-proto/phase-3',
    handle: { requiresAccess: canManageAutomations } satisfies AccessRouteHandle,
    lazy: lazyComponent(() => lazyProtoPhase3List()),
  },
  {
    path: '/automations-proto/phase-3/:id',
    handle: {
      hideAdminSidebar: true,
      requiresAccess: canManageAutomations,
    } satisfies AdminRouteHandle & AccessRouteHandle,
    lazy: lazyComponent(() => lazyProtoPhase3Detail()),
  },
  {
    path: '/automations-proto/exploration-2',
    handle: { requiresAccess: canManageAutomations } satisfies AccessRouteHandle,
    lazy: lazyComponent(() => lazyProtoExploration2List()),
  },
  {
    path: '/automations-proto/exploration-2/:id',
    handle: {
      hideAdminSidebar: true,
      requiresAccess: canManageAutomations,
    } satisfies AdminRouteHandle & AccessRouteHandle,
    lazy: lazyComponent(() => lazyProtoExploration2Detail()),
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
    lazy: lazyComponent(lazySettingsScreen),
    children: settingsRouteChildren,
    handle: {
      allowInForceUpgrade: true,
      settingsSidebar: true,
      requiresAccess: canAccessSettingsRoute,
    } satisfies AdminRouteHandle & AccessRouteHandle,
  },
  { path: '/posts', lazy: lazyComponent(lazyPostsListRoute) },
  { path: '/pages', lazy: lazyComponent(lazyPagesListRoute) },
  {
    // Served by React or Ember depending on the `editorReact` Labs flag.
    //
    // The editor is a focused writing surface and has always hidden the nav
    // sidebar. Ember arranges that by setting `ui.isFullScreen` when the
    // editor route *activates* — but the Ember posts route aborts its
    // transition to hand off to React, so the editor route never deactivates,
    // and a second visit is a model change on an already-active route where
    // `activate()` does not run again. The sidebar came back from the second
    // post onwards. Deciding it from the route handle makes React the
    // authority, removes the cross-implementation handshake, and applies to
    // both sides of the `editorReact` flag.
    path: '/editor/*',
    Component: EditorGate,
    // EditorGate enforces force upgrade unless Ember owns both the editor and billing
    handle: { allowInForceUpgrade: true, hideAdminSidebar: true } satisfies AdminRouteHandle,
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
    // Served by React or Ember depending on the `billingReact` Labs flag. The
    // billing app itself stays mounted across routes (see BillingFrame), so
    // this route only decides access. Reachable in force upgrade: it is the
    // way out of it.
    path: '/pro/*',
    Component: BillingRoute,
    handle: { allowInForceUpgrade: true } satisfies AdminRouteHandle,
  },
  {
    // 404 catch-all for routes not handled by React or Ember
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

// Ember's router only learns about a URL change from `hashchange`, which the
// React router's pushState navigation does not fire, so links into Ember-owned
// routes must stay native hash anchors. Everything else can be a router link
// (and so gets router history state, which the unsaved-changes blockers need).
/** Decides for any path whether Ember owns it, for destinations only known at event time. */
export function useEmberOwnedRouteMatcher(): (pathname: string) => boolean {
  const editorOwner = useFlagGatedRouteOwner('editorReact');
  const billingOwner = useFlagGatedRouteOwner('billingReact');

  return useCallback(
    (pathname: string) => {
      const leaf = matchRoutes(routes, pathname)?.at(-1)?.route;
      if (!leaf) {
        return true;
      }
      if (leaf.Component === EditorGate) {
        return editorOwner !== 'react';
      }
      if (leaf.Component === BillingRoute) {
        return billingOwner !== 'react';
      }
      return false;
    },
    [editorOwner, billingOwner],
  );
}

export function useIsEmberOwnedRoute(pathname: string): boolean {
  return useEmberOwnedRouteMatcher()(pathname);
}

/** The matched route's path pattern, e.g. `/tags/:tagSlug`, never the path's own ids or slugs. */
function matchedRoutePattern(pathname: string): string {
  let pattern = '';
  for (const { route } of matchRoutes(routes, pathname) ?? []) {
    if (route.path) {
      // An absolute child path already repeats its parents' paths
      pattern = route.path.startsWith('/') ? route.path : `${pattern}/${route.path}`;
    }
  }
  return pattern.replace(/\/\/+/g, '/') || '/';
}

/** The route pattern React is showing, or null while Ember serves the screen. */
export function useRoutePattern(): string | null {
  const { pathname } = useLocation();
  const isEmberOwned = useIsEmberOwnedRoute(pathname);
  return isEmberOwned ? null : matchedRoutePattern(pathname);
}

/** Tells Ember which route pattern React is showing, or null while Ember serves the screen. */
export function useSyncEmberRoutePattern(): void {
  const routePattern = useRoutePattern();

  useEffect(() => syncEmberRoutePattern(routePattern), [routePattern]);
}
