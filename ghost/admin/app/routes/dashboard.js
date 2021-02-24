import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class DashboardRoute extends AuthenticatedRoute {
    beforeModel() {
        super.beforeModel(...arguments);
        return this.session.user.then((user) => {
            if (!user.isOwnerOrAdmin) {
                return this.transitionTo('site');
            }
        });
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
