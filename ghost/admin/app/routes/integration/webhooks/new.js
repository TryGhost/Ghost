import Route from '@ember/routing/route';

export default Route.extend({
    model() {
        let integration = this.modelFor('integration');
        return this.store.createRecord('webhook', {integration});
    },

    deactivate() {
        this._super(...arguments);
        this.controller.webhook.rollbackAttributes();
    }
});
