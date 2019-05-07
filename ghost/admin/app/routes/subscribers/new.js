import Route from '@ember/routing/route';

export default Route.extend({
    model() {
        return this.store.createRecord('subscriber');
    },

    setupController(controller, model) {
        controller.set('subscriber', model);
    },

    deactivate() {
        let subscriber = this.controller.get('subscriber');

        this._super(...arguments);

        if (subscriber.get('isNew')) {
            this.rollbackModel();
        }
    },

    actions: {
        save() {
            let subscriber = this.controller.get('subscriber');
            return subscriber.save();
        },

        cancel() {
            this.rollbackModel();
            this.transitionTo('subscribers');
        }
    },

    rollbackModel() {
        let subscriber = this.controller.get('subscriber');
        subscriber.rollbackAttributes();
    }
});
