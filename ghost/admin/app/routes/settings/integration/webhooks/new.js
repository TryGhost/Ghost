import AdminRoute from 'ghost-admin/routes/admin';

export default class NewRoute extends AdminRoute {
    model() {
        let integration = this.modelFor('settings.integration');
        return this.store.createRecord('webhook', {integration});
    }

    deactivate() {
        super.deactivate(...arguments);
        this.controller.webhook.rollbackAttributes();
    }
}
