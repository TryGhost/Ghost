import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class PostsXRoute extends AuthenticatedRoute {
    @inject config;
    @service session;
    @service feature;

    setupController(controller, model, transition) {
        if (transition.from?.name.includes('stats-x')) {
            controller.fromAnalytics = true;
        } else {
            controller.fromAnalytics = false;
        }
    }

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
