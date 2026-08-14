import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class SiteRoute extends AuthenticatedRoute {
    model() {
        return (new Date()).valueOf();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Site'
        };
    }
}
