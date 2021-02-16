import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class DashboardRoute extends AuthenticatedRoute {
    buildRouteInfoMetadata() {
        return {
            mainClasses: ['gh-main-wide']
        };
    }
}
