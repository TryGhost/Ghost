var DebugRoute = Ember.Route.extend({
    beforeModel: function () {
        this.transitionTo('settings.debug');
    }
});

export default DebugRoute;
