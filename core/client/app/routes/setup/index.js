import Ember from 'ember';

var SetupRoute = Ember.Route.extend({
    beforeModel: function () {
        this.transitionTo('setup.one');
    }
});

export default SetupRoute;
