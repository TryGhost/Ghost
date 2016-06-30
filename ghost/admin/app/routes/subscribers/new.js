import Route from 'ember-route';

export default Route.extend({
    model() {
        return this.get('store').createRecord('subscriber');
    },

    deactivate() {
        let subscriber = this.controller.get('model');

        this._super(...arguments);

        if (subscriber.get('isNew')) {
            this.rollbackModel();
        }
    },

    rollbackModel() {
        let subscriber = this.controller.get('model');
        subscriber.rollbackAttributes();
    },

    actions: {
        save() {
            let subscriber = this.controller.get('model');
            return subscriber.save().then((saved) => {
                this.send('addSubscriber', saved);
                return saved;
            });
        },

        cancel() {
            this.rollbackModel();
            this.transitionTo('subscribers');
        }
    }
});
