import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default AuthenticatedRoute.extend({
    titleToken: 'Site',

    model() {
        return (new Date()).valueOf();
    }
});
