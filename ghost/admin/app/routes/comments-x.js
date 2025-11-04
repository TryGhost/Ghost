import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class CommentsXRoute extends AuthenticatedRoute {
    @inject config;
    @service session;

    beforeModel() {
        super.beforeModel(...arguments);

        // Only admins can access comments
        if (!this.session.user.isAdmin) {
            return this.transitionTo('site');
        }
    }
}
