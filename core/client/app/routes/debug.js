import Ember from 'ember';
var DebugRoute = Ember.Route.extend({
    beforeModel: function () {
        this.transitionTo('settings.labs');
    }
});

export default DebugRoute;
