import AdminRoute from 'ghost-admin/routes/admin';
import WebhookFormModal from '../../../../components/settings/integrations/webhook-form-modal';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class EditWebhookRoute extends AdminRoute {
    @service modals;
    @service router;

    webhook = null;
    modal = null;

    get integration() {
        return this.modelFor('settings.integration');
    }

    model(params) {
        return this.integration.webhooks.findBy('id', params.webhook_id);
    }

    setupController(controller, model) {
        this.webhook = model;

        this.modal = this.modals.open(WebhookFormModal, {
            webhook: this.webhook
        }, {
            beforeClose: this.beforeModalClose
        });
    }

    deactivate() {
        this.webhook?.errors.clear();
        this.webhook?.rollbackAttributes();

        // ensure we don't try to redirect on modal close if we're already transitioning away
        this.isLeaving = true;
        this.modal?.close();

        this.modal = null;
        this.isLeaving = false;
    }

    @action
    beforeModalClose() {
        if (this.modal && !this.isLeaving) {
            this.router.transitionTo('settings.integration', this.integration);
        }
    }
}
