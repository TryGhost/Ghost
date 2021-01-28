import Route from '@ember/routing/route';

export default Route.extend({
    model(params) {
        let integration = this.modelFor('integration');
        let webhook = integration.webhooks.findBy('id', params.webhook_id);
        return webhook;
    },

    deactivate() {
        this._super(...arguments);
        this.controller.reset();
    }
});
