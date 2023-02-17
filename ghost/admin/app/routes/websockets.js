import AuthenticatedRoute from './authenticated';
import {inject as service} from '@ember/service';

// need this to be authenticated
export default class WebsocketRoute extends AuthenticatedRoute {
    @service session;

    beforeModel() {
        super.beforeModel(...arguments);

        const user = this.session.user;

        if (!user.isAdmin) {
            return this.transitionTo('settings.staff.user', user);
        }
    }
}
