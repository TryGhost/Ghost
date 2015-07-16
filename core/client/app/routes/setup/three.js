import Ember from 'ember';

export default Ember.Route.extend({
    beforeModel: function () {
        if (!this.controllerFor('setup.two').get('blogCreated')) {
            this.transitionTo('setup.two');
        }
    }
});
