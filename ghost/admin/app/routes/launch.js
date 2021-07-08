import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class LaunchRoute extends AuthenticatedRoute {
    @service session;

    beforeModel() {
        super.beforeModel(...arguments);
        if (!this.session.user.isOwner) {
            return this.transitionTo('home');
        }
    }
}
