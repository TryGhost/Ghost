import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    // Allowed actions
    confirm: () => {},

    tag: alias('model'),

    postInflection: computed('tag.count.posts', function () {
        return this.get('tag.count.posts') > 1 ? 'posts' : 'post';
    }),

    actions: {
        confirm() {
            this.deleteTag.perform();
        }
    },

    deleteTag: task(function* () {
        try {
            yield this.confirm();
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
