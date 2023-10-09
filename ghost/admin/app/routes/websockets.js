import AuthenticatedRoute from './authenticated';
import {inject as service} from '@ember/service';

// need this to be authenticated
export default class WebsocketRoute extends AuthenticatedRoute {
    @service session;
    @service router;

    beforeModel() {
        super.beforeModel(...arguments);

        const user = this.session.user;

        if (!user.isAdmin) {
            return this.router.transitionTo('settings-x.settings-x', `staff/${user.slug}`);
        }
    }
}
