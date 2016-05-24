import ModalComponent from 'ghost-admin/components/modals/base';
import {invokeAction} from 'ember-invoke-action';

export default ModalComponent.extend({
    user: null,
    submitting: false,

    actions: {
        confirm() {
            this.set('submitting', true);

            invokeAction(this, 'confirm').finally(() => {
                this.send('closeModal');
            });
        }
    }
});
