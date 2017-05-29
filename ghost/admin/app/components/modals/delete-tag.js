import ModalComponent from 'ghost-admin/components/modals/base';
import computed, {alias} from 'ember-computed';
import {invokeAction} from 'ember-invoke-action';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({

    tag: alias('model'),

    postInflection: computed('tag.count.posts', function () {
        return this.get('tag.count.posts') > 1 ? 'posts' : 'post';
    }),

    deleteTag: task(function* () {
        try {
            yield invokeAction(this, 'confirm');
        } finally {
            this.send('closeModal');
        }
    }).drop(),

    actions: {
        confirm() {
            this.get('deleteTag').perform();
        }
    }
});
