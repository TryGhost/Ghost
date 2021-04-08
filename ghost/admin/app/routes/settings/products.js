import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class ProductsRoute extends AuthenticatedRoute {
    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Products'
        };
    }
}
