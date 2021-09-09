import ModalComponent from 'ghost-admin/components/modal-base';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    feature: service(),
    // Allowed actions
    confirm: () => {},

    actions: {
        confirm() {
            this.enableTiers.perform();
        }
    },

    enableTiers: task(function* () {
        try {
            yield this.feature.set('multipleProducts', true);
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
