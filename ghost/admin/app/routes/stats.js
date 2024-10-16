import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject} from 'ghost-admin/decorators/inject';

export default class StatsRoute extends AuthenticatedRoute {
    @inject config;

    beforeModel() {
        super.beforeModel(...arguments);

        // This is based on the logic for the dashboard
        if (this.session.user.isContributor) {
            return this.transitionTo('posts');
        } else if (!this.session.user.isAdmin) {
            return this.transitionTo('site');
        }

        // This ensures that we don't load this page if the stats config is not set
        if (!this.config.stats) {
            return this.transitionTo('home');
        }
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Stats'
        };
    }
}
