import ModalComponent from 'ghost-admin/components/modals/base';
import {invokeAction} from 'ember-invoke-action';
import {alias} from 'ember-computed';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({

    user: alias('model'),

    deleteUser: task(function* () {
        try {
            yield invokeAction(this, 'confirm');
        } finally {
            this.send('closeModal');
        }
    }).drop(),

    actions: {
        confirm() {
            this.get('deleteUser').perform();
        }
    }
});
