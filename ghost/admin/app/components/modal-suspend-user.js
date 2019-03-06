import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    // Allowed actions
    confirm: () => {},

    user: alias('model'),

    actions: {
        confirm() {
            return this.suspendUser.perform();
        }
    },

    suspendUser: task(function* () {
        try {
            yield this.confirm();
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
