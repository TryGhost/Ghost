import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    membersStats: service(),

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
            this.membersStats.invalidate();
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
