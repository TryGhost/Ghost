import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SignoutRoute extends AuthenticatedRoute {
    @service feature;
    @service notifications;

    // React signs out when it owns the auth screens; a second DELETE here
    // would race its reload.
    beforeModel(transition) {
        if (this.feature.isAuthReact()) {
            transition.abort();
            return;
        }

        return super.beforeModel(...arguments);
    }

    afterModel/*model, transition*/() {
        this.notifications.clearAll();
        this.session.invalidate();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Sign Out'
        };
    }
}
