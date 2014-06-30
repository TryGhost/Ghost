
var SettingsIndexRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, {
    // redirect to general tab
    redirect: function () {
        this.transitionTo('settings.general');
    }
});

export default SettingsIndexRoute;
