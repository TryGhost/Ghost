import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class DashboardRoute extends AuthenticatedRoute {
    async beforeModel() {
        super.beforeModel(...arguments);

        if (this.session.user.isContributor) {
            return this.transitionTo('posts');
        } else if (!this.session.user.isAdmin) {
            return this.transitionTo('site');
        }
    }

    buildRouteInfoMetadata() {
        return {
            mainClasses: ['gh-main-wide']
        };
    }

    // trigger a background load of members plus labels for filter dropdown
    setupController() {
        super.setupController(...arguments);
    }

    model() {
        return this.controllerFor('dashboard').loadSiteStatusTask.perform();
    }
}
