import ModalComponent from 'ghost-admin/components/modal-base';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    confirmed: false,
    response: null,
    error: null,

    // Allowed actions
    confirm: () => {},

    actions: {
        confirm() {
            this.deleteMembersTask.perform();
        }
    },

    deleteMembersTask: task(function* () {
        try {
            this.set('response', yield this.confirm());
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
