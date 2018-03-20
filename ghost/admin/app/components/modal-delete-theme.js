import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    // Allowed actions
    confirm: () => {},

    theme: alias('model.theme'),
    download: alias('model.download'),

    actions: {
        confirm() {
            this.get('deleteTheme').perform();
        }
    },

    deleteTheme: task(function* () {
        try {
            yield this.confirm();
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
