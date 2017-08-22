import Route from '@ember/routing/route';

export default Route.extend({
    actions: {
        cancel() {
            this.transitionTo('subscribers');
        }
    }
});
