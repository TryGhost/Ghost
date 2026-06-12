import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class UnauthenticatedRoute extends Route {
    @service ajax;
    @service feature;
    @service ghostPaths;
    @service session;

    beforeModel(transition) {
        if (this.feature.authX) {
            // The React auth screens own signin/signup/reset/setup: park the
            // hidden Ember app instead of running the setup check and
            // prohibitAuthentication, whose transition rewrites the shared
            // URL and races React's post-signin deep-link redirect.
            transition.abort();
            return;
        }

        let authUrl = this.ghostPaths.url.api('authentication', 'setup');

        // check the state of the setup process via the API
        return this.ajax.request(authUrl).then((result) => {
            let [setup] = result.setup;

            if (setup.status !== true) {
                this.transitionTo('setup');
            } else {
                return this.session.prohibitAuthentication('home');
            }
        });
    }

    buildRouteInfoMetadata() {
        return {
            bodyClasses: ['unauthenticated-route']
        };
    }
}
