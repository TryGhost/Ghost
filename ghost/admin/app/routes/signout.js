import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SignoutRoute extends AuthenticatedRoute {
    @service notifications;

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
