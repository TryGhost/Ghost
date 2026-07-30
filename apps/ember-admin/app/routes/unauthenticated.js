import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class UnauthenticatedRoute extends Route {
    @service ajax;
    @service ghostPaths;
    @service session;

    beforeModel() {
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
