import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    router: service(),
    feature: service(),
    notifications: service(),
    integration: alias('model'),
    actions: {
        confirm() {
            this.deleteIntegration.perform();
        }
    },
    deleteIntegration: task(function* () {
        try {
            yield this.confirm();
            this.router.transitionTo('settings.integrations');
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'integration.delete.failed'});
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
