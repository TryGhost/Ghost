import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class HelpRoute extends AuthenticatedRoute {
    model() {
        return (new Date()).valueOf();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Help'
        };
    }
}
