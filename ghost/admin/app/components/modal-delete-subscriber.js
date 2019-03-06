import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    // Allowed actions
    confirm: () => {},

    subscriber: alias('model'),

    actions: {
        confirm() {
            this.deleteSubscriber.perform();
        }
    },

    deleteSubscriber: task(function* () {
        yield this.confirm();
    }).drop()
});
