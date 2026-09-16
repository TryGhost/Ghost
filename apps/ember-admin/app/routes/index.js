import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

// The root URL is React-owned; this implicit index route only has to keep `/`
// recognized and behind authentication for the Ember router.
export default class IndexRoute extends AuthenticatedRoute {}
