import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {invokeAction} from 'ember-invoke-action';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({

    theme: alias('model.theme'),
    download: alias('model.download'),

    actions: {
        confirm() {
            this.get('deleteTheme').perform();
        }
    },

    deleteTheme: task(function* () {
        try {
            yield invokeAction(this, 'confirm');
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
