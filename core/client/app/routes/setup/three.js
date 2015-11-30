import Ember from 'ember';

const {Route} = Ember;

export default Route.extend({
    beforeModel() {
        if (!this.controllerFor('setup.two').get('blogCreated')) {
            this.transitionTo('setup.two');
        }
    }
});
