import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class MigrateRoute extends AuthenticatedRoute {
    @service feature;
    @service session;

    beforeModel() {
        super.beforeModel(...arguments);

        // Only allow Owner & Administrator to access this route
        if (!this.session.user.isAdmin) {
            return this.transitionTo('home');
        }
    }
}
