import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SignoutRoute extends AuthenticatedRoute {
    @service feature;
    @service notifications;

    afterModel/*model, transition*/() {
        // The React signout screen (authX) deletes the session and reloads the
        // page itself; invalidating here as well would race that flow.
        if (this.feature.authX) {
            return;
        }

        this.notifications.clearAll();
        this.session.invalidate();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Sign Out'
        };
    }
}
