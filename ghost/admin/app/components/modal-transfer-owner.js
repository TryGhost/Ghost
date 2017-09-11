import ModalComponent from 'ghost-admin/components/modal-base';
import {invokeAction} from 'ember-invoke-action';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    user: null,

    transferOwnership: task(function* () {
        try {
            yield invokeAction(this, 'confirm');
        } finally {
            this.send('closeModal');
        }
    }).drop(),

    actions: {
        confirm() {
            this.get('transferOwnership').perform();
        }
    }
});
