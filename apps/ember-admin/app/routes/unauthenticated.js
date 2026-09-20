import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class UnauthenticatedRoute extends Route {
    @service ajax;
    @service ghostPaths;
    @service session;

    beforeModel() {
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
