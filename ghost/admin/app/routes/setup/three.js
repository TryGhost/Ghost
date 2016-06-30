import Route from 'ember-route';

export default Route.extend({
    beforeModel() {
        this._super(...arguments);
        if (!this.controllerFor('setup.two').get('blogCreated')) {
            this.transitionTo('setup.two');
        }
    }
});
