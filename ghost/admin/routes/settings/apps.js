import AuthenticatedRoute from 'ghost/routes/authenticated';

var AppsRoute = AuthenticatedRoute.extend({
    beforeModel: function () {
        if (!this.get('config.apps')) {
            this.transitionTo('settings.general');
        }
    },
    model: function () {
        return this.store.find('app');
    }
});

export default AppsRoute;
