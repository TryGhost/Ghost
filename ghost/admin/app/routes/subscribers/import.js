import Ember from 'ember';

const {Route} = Ember;

export default Route.extend({
    actions: {
        cancel() {
            this.transitionTo('subscribers');
        }
    }
});
