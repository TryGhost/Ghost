import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
export default class StatsRoute extends AuthenticatedRoute {
    @inject config;
    @service feature;

    queryParams = {
        device: {refreshModel: true},
        browser: {refreshModel: true},
        location: {refreshModel: true},
        source: {refreshModel: true},
        pathname: {refreshModel: true},
        os: {refreshModel: true}
    };

    beforeModel() {
        super.beforeModel(...arguments);

        // This is based on the logic for the dashboard
        if (this.session.user.isContributor) {
            return this.transitionTo('posts');
        } else if (!this.session.user.isAdmin) {
            return this.transitionTo('site');
        }

        // ensure we don't load the app if flags aren't enabled
        if (!this.feature.trafficAnalytics || !this.feature.ui60) {
            return this.transitionTo('home');
        }
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Stats'
        };
    }
}
