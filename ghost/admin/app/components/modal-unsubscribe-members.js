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
            this.unsubscribeMemberTask.perform();
        }
    },

    unsubscribeMemberTask: task(function* () {
        try {
            const response = yield this.confirm();
            this.set('response', response);
            this.set('confirmed', true);
        } catch (e) {
            if (e.payload?.errors) {
                this.set('confirmed', true);
                this.set('error', e.payload.errors[0].message);
            }
            throw e;
        }
    }).drop()
});
