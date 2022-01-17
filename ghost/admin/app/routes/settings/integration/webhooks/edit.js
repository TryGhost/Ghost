import AdminRoute from 'ghost-admin/routes/admin';

export default class EditRoute extends AdminRoute {
    model(params) {
        let integration = this.modelFor('settings.integration');
        let webhook = integration.webhooks.findBy('id', params.webhook_id);
        return webhook;
    }

    deactivate() {
        super.deactivate(...arguments);
        this.controller.reset();
    }
}
