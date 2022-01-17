import AuthenticatedRoute from './authenticated';
import {inject as service} from '@ember/service';

export default class AdminRoute extends AuthenticatedRoute {
    @service session;

    beforeModel() {
        super.beforeModel(...arguments);

        if (!this.session.user.isAdmin) {
            return this.transitionTo('home');
        }
    }
}
