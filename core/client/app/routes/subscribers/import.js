import Ember from 'ember';

export default Ember.Route.extend({
    actions: {
        cancel() {
            this.transitionTo('subscribers');
        }
    }
});
