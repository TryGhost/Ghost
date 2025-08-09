import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class DashboardRoute extends AuthenticatedRoute {
    async beforeModel() {
        super.beforeModel(...arguments);

        // Redirect all users to analytics since dashboard has been retired
        return this.transitionTo('stats-x');
    }
}