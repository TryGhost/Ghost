import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class DashboardRoute extends AuthenticatedRoute {
    @service feature;

    beforeModel() {
        super.beforeModel(...arguments);

        if (!this.session.user.isAdmin) {
            return this.transitionTo('site');
        }

        if (!this.feature.dashboardTwo) {
            return this.transitionTo('dashboard');
        }
    }

    buildRouteInfoMetadata() {
        return {
            mainClasses: ['gh-main-wide']
        };
    }

    setupController() {
        this.controller.initialise();
    }
}
