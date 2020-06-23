import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    // Allowed actions
    confirm: () => {},

    stripeConnectIntegration: alias('model.stripeConnectIntegration'),

    actions: {
        confirm() {
            this.disconnectStripe.perform();
        }
    },

    disconnectStripe: task(function* () {
        try {
            yield this.confirm();
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
