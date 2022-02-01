import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class DashboardRoute extends AuthenticatedRoute {
    @service feature;
    @service modals;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        if (!this.session.user.isAdmin) {
            return this.transitionTo('site');
        }

        if (this.feature.improvedOnboarding && transition.to?.queryParams?.firstStart === 'true') {
            this.modals.open('modals/get-started');

            // clear the query param so it doesn't stick around
            transition.abort();
            const queryParams = Object.assign({}, transition.to.queryParams, {firstStart: false});
            this.transitionTo('dashboard', {queryParams});
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
