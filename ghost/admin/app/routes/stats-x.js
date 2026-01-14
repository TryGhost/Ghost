import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
export default class StatsXRoute extends AuthenticatedRoute {
    @inject config;
    @service feature;

    beforeModel() {
        super.beforeModel(...arguments);
        // This is based on the logic for the dashboard
        if (this.session.user.isContributor) {
            return this.transitionTo('posts');
        } else if (!this.session.user.isAdmin) {
            return this.transitionTo('site');
        }
    }
}