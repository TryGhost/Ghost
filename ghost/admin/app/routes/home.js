import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

// The React admin owns "/": the role-based redirect and the ?firstStart=true
// onboarding entry both live in apps/admin/src/home-redirect.tsx. This route
// is only the hidden Ember app's parking spot for the shared URL — internal
// Ember transitions (routeAfterAuthentication, permission guards'
// transitionTo('home')) land here, render nothing and leave the redirect to
// React, which reacts to the URL change. The inherited authenticated-route
// check still runs, so signed-out visits rewrite the URL to the signin
// screen (which React relies on).
export default class HomeRoute extends AuthenticatedRoute {}
