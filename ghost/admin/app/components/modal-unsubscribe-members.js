import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    membersStats: service(),

    shouldCancelSubscriptions: false,

    // Allowed actions
    confirm: () => {},

    member: alias('model'),

    actions: {
        confirm() {
            this.unsubscribeMember.perform();
        }
    },

    unsubscribeMemberTask: task(function* () {
        try {
            yield this.confirm();
            this.membersStats.invalidate();
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
