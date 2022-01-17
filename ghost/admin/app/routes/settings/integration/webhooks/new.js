import AdminRoute from 'ghost-admin/routes/admin';

export default AdminRoute.extend({
    model() {
        let integration = this.modelFor('settings.integration');
        return this.store.createRecord('webhook', {integration});
    },

    deactivate() {
        this._super(...arguments);
        this.controller.webhook.rollbackAttributes();
    }
});
