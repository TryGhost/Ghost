import ModalComponent from 'ghost-admin/components/modals/base';
import {alias} from 'ember-computed';
import {invokeAction} from 'ember-invoke-action';

export default ModalComponent.extend({

    submitting: false,

    theme: alias('model.theme'),
    download: alias('model.download'),

    actions: {
        confirm() {
            this.set('submitting', true);

            invokeAction(this, 'confirm').finally(() => {
                this.send('closeModal');
            });
        }
    }
});
