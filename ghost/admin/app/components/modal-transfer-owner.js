import ModalComponent from 'ghost-admin/components/modal-base';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    user: null,

    // Allowed actions
    confirm: () => {},

    actions: {
        confirm() {
            this.transferOwnership.perform();
        }
    },

    transferOwnership: task(function* () {
        try {
            yield this.confirm();
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
