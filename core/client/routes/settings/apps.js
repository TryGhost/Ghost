var AppsRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, {
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
