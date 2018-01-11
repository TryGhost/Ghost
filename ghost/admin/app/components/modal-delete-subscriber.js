import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {invokeAction} from 'ember-invoke-action';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({

    subscriber: alias('model'),

    actions: {
        confirm() {
            this.get('deleteSubscriber').perform();
        }
    },

    deleteSubscriber: task(function* () {
        yield invokeAction(this, 'confirm');
    }).drop()
});
