import {
  type AdminRouteHandle,
  type RouteObject,
  Outlet,
  lazyComponent,
  matchRoutes,
  redirect,
} from '@tryghost/admin-x-framework';

// ActivityPub
import { FeatureFlagsProvider, routes as activityPubRoutes } from '@tryghost/activitypub/api';

// Stats (aka analytics)
import { AnalyticsProvider, analyticsRouteChildren } from './analytics/api';
import MyProfileRedirect from './my-profile-redirect';

// Ember
import { EmberFallback, ForceUpgradeGuard } from './ember-bridge';
import HomeRedirect from './home-redirect';
import { EmberListWithGiftLinks } from './gift-link-modal-host';
import { TagDetailGate } from './tag-detail-gate';
import { useFlagGatedRouteOwner } from './use-flag-gated-route-owner';
import { type AccessRouteHandle } from './route-access';
import { RouteAccessGuard } from './route-access-guard';
import { lazyAutomationEditorScreen, lazyAutomationsScreen } from './automations/api';
import { lazyCommentsScreen } from './comments/api';
import { membersRouteChildren } from './members/api';
import { OnboardingRedirect, lazyOnboardingScreen } from './onboarding/api';
import { lazyPostAnalyticsRoot, postAnalyticsRouteChildren } from './posts/api';
import { canAccessSettingsRoute, lazySettingsScreen, settingsRouteChildren } from './settings/api';
import { lazyTagsScreen } from './tags/api';
import {
  canManageAutomations,
  canManageMembers,
  canManageTags,
} from '@tryghost/admin-x-framework/api/users';

import { NotFound } from './shared/not-found';

// Routes handled by the Ember admin app. React delegates these to Ember via
// EmberFallback. When migrating a route to React, remove its entry from here.
const EMBER_ROUTES: string[] = [
  '/site',
  '/setup',
  '/signin/*',
  '/signout',
  '/signup/*',
  '/reset/*',
  '/pro/*',
  '/posts/analytics/:postId/debug',
  '/restore',
  '/editor/*',
  '/migrate/*',
  '/members-activity',
];

const emberFallbackHandle = { allowInForceUpgrade: true } satisfies AdminRouteHandle;

const emberFallbackRoutes: RouteObject[] = EMBER_ROUTES.map((path) => ({
  path,
  Component: EmberFallback,
  handle: emberFallbackHandle,
}));

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
    // The automation editor hides the admin sidebar for a focused,
    // full-screen editing surface.
    path: '/automations/:id',
    handle: {
      hideAdminSidebar: true,
      requiresAccess: canManageAutomations,
    } satisfies AdminRouteHandle & AccessRouteHandle,
    lazy: lazyComponent(lazyAutomationEditorScreen),
  },
  {
    // Covers both edit (`:tagSlug`) and create (the sentinel `new`) —
    // Ember's router declared `/tags/new` before `/tags/:tag_slug`, so a
    // tag with the literal slug "new" was already unreachable.
    //
    // TagDetailGate serves Ember or React depending on the
    // `tagDetailsReact` Labs flag.
    path: '/tags/:tagSlug',
    Component: TagDetailGate,
    handle: { requiresAccess: canManageTags } satisfies AccessRouteHandle,
  },
  {
    path: '/members',
    handle: { requiresAccess: canManageMembers } satisfies AccessRouteHandle,
    children: membersRouteChildren,
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
    // hideAdminSidebar lives on the handle, not the lazy module, so the shell
    // hides at first paint instead of waiting on the settings chunk.
    path: `settings`,
    lazy: lazyComponent(lazySettingsScreen),
    children: settingsRouteChildren,
    handle: {
      allowInForceUpgrade: true,
      hideAdminSidebar: true,
      requiresAccess: canAccessSettingsRoute,
    } satisfies AdminRouteHandle & AccessRouteHandle,
  },
  { path: '/posts', Component: EmberListWithGiftLinks, handle: emberFallbackHandle },
  { path: '/pages', Component: EmberListWithGiftLinks, handle: emberFallbackHandle },
  // Ember-handled routes
  ...emberFallbackRoutes,
  {
    // 404 catch-all for routes not handled by React or Ember
    path: '*',
    Component: NotFound,
  },
];

export const routes: RouteObject[] = [
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
const EMBER_ROUTE_COMPONENTS = new Set<unknown>([EmberFallback, EmberListWithGiftLinks]);

export function useIsEmberOwnedRoute(pathname: string): boolean {
  const tagDetailOwner = useFlagGatedRouteOwner('tagDetailsReact');
  const leaf = matchRoutes(routes, pathname)?.at(-1)?.route;
  if (!leaf) {
    return true;
  }
  if (leaf.Component === TagDetailGate) {
    return tagDetailOwner !== 'react';
  }
  return EMBER_ROUTE_COMPONENTS.has(leaf.Component);
}
