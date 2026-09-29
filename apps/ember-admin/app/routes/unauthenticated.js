import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class UnauthenticatedRoute extends Route {
    @service ajax;
    @service feature;
    @service ghostPaths;
    @service session;

    beforeModel(transition) {
        // React owns the auth screens when the flag is on. Aborting keeps this
        // hidden app from checking setup or redirecting signed-in users over
        // the URL React is navigating.
        if (this.feature.isAuthReact()) {
            transition.abort();
            return;
        }

        const authUrl = this.ghostPaths.url.api('authentication', 'setup');

        // check the state of the setup process via the API
        return this.ajax.request(authUrl).then((result) => {
            const [setup] = result.setup;

            if (setup.status !== true) {
                this.transitionTo('setup');
            } else {
                return this.session.prohibitAuthentication('index');
            }
        });
    }

    buildRouteInfoMetadata() {
        return {
            bodyClasses: ['unauthenticated-route']
        };
    }
}
