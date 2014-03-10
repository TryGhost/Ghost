var SettingsIndexRoute = Ember.Route.extend({
    // redirect to general tab
    redirect: function () {
        this.transitionTo('settings.general');
    }
});

export default SettingsIndexRoute;