import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class LaunchRoute extends AuthenticatedRoute {
    @service session;

    beforeModel() {
        super.beforeModel(...arguments);
        return this.session.user.then((user) => {
            if (!user.isOwner) {
                return this.transitionTo('home');
            }
        });
    }
}
