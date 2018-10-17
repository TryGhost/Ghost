import Route from '@ember/routing/route';

export default Route.extend({
    model() {
        return this.store.createRecord('integration');
    },

    deactivate() {
        this._super(...arguments);
        this.controller.integration.rollbackAttributes();
    }
});
