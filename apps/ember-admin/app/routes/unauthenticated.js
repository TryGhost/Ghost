import Route from '@ember/routing/route';

// React serves the auth screens. Aborting keeps this hidden app from
// redirecting over the URL React is navigating.
export default class UnauthenticatedRoute extends Route {
    beforeModel(transition) {
        transition.abort();
    }
}
