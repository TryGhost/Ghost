import AuthenticatedRoute from 'ghost/routes/authenticated';

var AppsRoute = AuthenticatedRoute.extend({
    model: function () {
        return this.store.find('app');
    }
});

export default AppsRoute;
