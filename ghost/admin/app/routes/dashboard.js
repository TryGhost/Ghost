import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class DashboardRoute extends AuthenticatedRoute {
    beforeModel() {
        super.beforeModel(...arguments);
        if (!this.session.user.isOwnerOrAdmin) {
            return this.transitionTo('site');
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
