import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default AuthenticatedRoute.extend({
    model() {
        return (new Date()).valueOf();
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Site'
        };
    }
});
