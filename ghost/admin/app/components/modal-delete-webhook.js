import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    notifications: service(),

    webhook: alias('model'),

    actions: {
        confirm() {
            this.deleteWebhook.perform();
        }
    },

    deleteWebhook: task(function* () {
        try {
            yield this.confirm();
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'webhook.delete.failed'});
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
