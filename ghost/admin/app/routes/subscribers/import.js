import Route from 'ember-route';

export default Route.extend({
    actions: {
        cancel() {
            this.transitionTo('subscribers');
        }
    }
});
