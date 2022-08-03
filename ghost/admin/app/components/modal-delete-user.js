import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    store: service(),

    // Allowed actions
    confirm: () => {},

    user: alias('model'),

    actions: {
        confirm() {
            this.deleteUser.perform();
        }
    },

    get ownerUser() {
        return this.store.peekAll('user').findBy('isOwnerOnly', true);
    },

    deleteUser: task(function* () {
        try {
            yield this.confirm();
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
