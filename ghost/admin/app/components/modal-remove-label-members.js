import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    membersStats: service(),
    selectedLabel: null,

    // Allowed actions
    confirm: () => {},

    member: alias('model'),

    actions: {
        confirm() {
            this.removeLabelTask.perform();
        },

        setLabel(label) {
            this.set('selectedLabel', label);
        }
    },

    removeLabelTask: task(function* () {
        try {
            yield this.confirm(this.selectedLabel);
            this.membersStats.invalidate();
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
