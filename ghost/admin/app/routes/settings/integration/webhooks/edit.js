import AdminRoute from 'ghost-admin/routes/admin';

export default AdminRoute.extend({
    model(params) {
        let integration = this.modelFor('settings.integration');
        let webhook = integration.webhooks.findBy('id', params.webhook_id);
        return webhook;
    },

    deactivate() {
        this._super(...arguments);
        this.controller.reset();
    }
});
