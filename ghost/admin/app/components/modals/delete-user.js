import ModalComponent from 'ghost-admin/components/modals/base';
import {invokeAction} from 'ember-invoke-action';
import {alias} from 'ember-computed';

export default ModalComponent.extend({

    submitting: false,

    user: alias('model'),

    actions: {
        confirm() {
            this.set('submitting', true);

            invokeAction(this, 'confirm').finally(() => {
                this.send('closeModal');
            });
        }
    }
});
