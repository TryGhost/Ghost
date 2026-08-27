import { type RouteObject, Navigate, lazyComponent } from '@tryghost/admin-x-framework';

// The child routes under `settings`. The shell (apps/admin/src/routes.tsx)
// mounts these under the `settings` route node, whose element renders the
// settings providers and chrome — routed dialogs render through its Outlet.
// Paths mirror the legacy modal-route contract exactly; route ranking (static
// over dynamic over splat) resolves overlaps like offers/edit/retention vs
// offers/edit/:offerId. `handle.dialogGroup` marks sibling routes rendered by
// one dialog instance (the staff tabs), so the history guard treats moving
// between them as a tab switch rather than leaving the dialog; containers that
// swap child components per route (offers, design/theme) stay ungrouped.
/** Sibling routes with the same group are rendered by one dialog instance. */
export type SettingsRouteHandle = { dialogGroup?: string };

export const settingsRouteChildren: RouteObject[] = [
  // Design and theme share one container across four entry paths; it reads
  // the path to pick its internal view.
  {
    path: 'design/change-theme',
    lazy: lazyComponent(() => import('./site/design-and-theme-modal')),
  },
  { path: 'design/edit', lazy: lazyComponent(() => import('./site/design-and-theme-modal')) },
  { path: 'theme/install', lazy: lazyComponent(() => import('./site/design-and-theme-modal')) },
  {
    path: 'theme/edit/:themeName',
    lazy: lazyComponent(() => import('./site/design-and-theme-modal')),
  },
  // Theme names may contain %2F; anything deeper than one segment is not a
  // valid editor URL.
  { path: 'theme/edit/*', element: <Navigate to="/settings/theme" replace /> },
  { path: 'navigation/edit', lazy: lazyComponent(() => import('./site/navigation-modal')) },
  {
    path: 'announcement-bar/edit',
    lazy: lazyComponent(() => import('./site/announcement-bar-modal')),
  },
  { path: 'staff/invite', lazy: lazyComponent(() => import('./general/invite-user-modal')) },
  {
    path: 'staff/:slug',
    handle: { dialogGroup: 'staff' } satisfies SettingsRouteHandle,
    lazy: lazyComponent(() => import('./general/user-detail-modal')),
  },
  {
    path: 'staff/:slug/edit',
    handle: { dialogGroup: 'staff' } satisfies SettingsRouteHandle,
    lazy: lazyComponent(() => import('./general/user-detail-modal')),
  },
  {
    path: 'staff/:slug/social-links',
    handle: { dialogGroup: 'staff' } satisfies SettingsRouteHandle,
    lazy: lazyComponent(() => import('./general/user-detail-modal')),
  },
  {
    path: 'staff/:slug/email-notifications',
    handle: { dialogGroup: 'staff' } satisfies SettingsRouteHandle,
    lazy: lazyComponent(() => import('./general/user-detail-modal')),
  },
  { path: 'portal/edit', lazy: lazyComponent(() => import('./membership/portal/portal-modal')) },
  { path: 'tiers/add', lazy: lazyComponent(() => import('./membership/tiers/tier-detail-modal')) },
  {
    path: 'tiers/:tierId',
    lazy: lazyComponent(() => import('./membership/tiers/tier-detail-modal')),
  },
  {
    path: 'stripe-connect',
    lazy: lazyComponent(() => import('./membership/stripe/stripe-connect-modal')),
  },
  {
    path: 'newsletters/new',
    lazy: lazyComponent(() => import('./email/newsletters/add-newsletter-modal')),
  },
  {
    path: 'newsletters/:newsletterId',
    lazy: lazyComponent(() => import('./email/newsletters/newsletter-detail-modal')),
  },
  { path: 'history/view/:userId?', lazy: lazyComponent(() => import('./advanced/history-modal')) },
  {
    path: 'integrations/new',
    lazy: lazyComponent(() => import('./advanced/integrations/add-integration-modal')),
  },
  {
    path: 'integrations/contentapi',
    lazy: lazyComponent(() => import('./advanced/integrations/content-api-modal')),
  },
  {
    path: 'integrations/zapier',
    lazy: lazyComponent(() => import('./advanced/integrations/zapier-modal')),
  },
  {
    path: 'integrations/transistor',
    lazy: lazyComponent(() => import('./advanced/integrations/transistor-modal')),
  },
  {
    path: 'integrations/slack',
    lazy: lazyComponent(() => import('./advanced/integrations/slack-modal')),
  },
  {
    path: 'integrations/unsplash',
    lazy: lazyComponent(() => import('./advanced/integrations/unsplash-modal')),
  },
  {
    path: 'integrations/firstpromoter',
    lazy: lazyComponent(() => import('./advanced/integrations/first-promoter-modal')),
  },
  {
    path: 'integrations/pintura',
    lazy: lazyComponent(() => import('./advanced/integrations/pintura-modal')),
  },
  {
    path: 'integrations/:integrationId',
    lazy: lazyComponent(() => import('./advanced/integrations/custom-integration-modal')),
  },
  {
    path: 'recommendations/add',
    lazy: lazyComponent(() => import('./growth/recommendations/add-recommendation-modal')),
  },
  // The edit flow opens from the recommendations list with the loaded record
  // (never URL-driven); the legacy route only ever redirected back in effect.
  { path: 'recommendations/edit', element: <Navigate to="/settings/recommendations" replace /> },
  {
    path: 'embed-signup-form/show',
    lazy: lazyComponent(() => import('./growth/embed-signup/embed-signup-form-modal')),
  },
  // The offers container owns list/add/edit/retention/success views and
  // reads the path to pick between them.
  {
    path: 'offers/new',
    lazy: lazyComponent(() => import('./growth/offers/offers-container-modal')),
  },
  {
    path: 'offers/edit',
    lazy: lazyComponent(() => import('./growth/offers/offers-container-modal')),
  },
  {
    path: 'offers/edit/:offerId',
    lazy: lazyComponent(() => import('./growth/offers/offers-container-modal')),
  },
  {
    path: 'offers/edit/retention/:offerId',
    lazy: lazyComponent(() => import('./growth/offers/offers-container-modal')),
  },
  {
    path: 'offers/success/:offerId',
    lazy: lazyComponent(() => import('./growth/offers/offers-container-modal')),
  },
  {
    path: 'explore/testimonial',
    lazy: lazyComponent(() => import('./growth/explore/testimonials-modal')),
  },
  { path: 'about', lazy: lazyComponent(() => import('./general/about')) },
  // The lock-site setting was merged into the Access section.
  { path: 'locksite', element: <Navigate to="/settings/members" replace /> },
  // Section anchors (/settings/<navid>) and unknown paths render the shell
  // alone; the shell scrolls to the section.
  { path: '*', element: null },
  { index: true, element: null },
];
