import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    // Allowed actions
    confirm: () => {},

    member: alias('model'),

    actions: {
        confirm() {
            this.deleteMember.perform();
        }
    },

    deleteMember: task(function* () {
        try {
            yield this.confirm();
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
