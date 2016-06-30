import computed, {alias} from 'ember-computed';
import ModalComponent from 'ghost-admin/components/modals/base';
import {invokeAction} from 'ember-invoke-action';

export default ModalComponent.extend({

    submitting: false,

    tag: alias('model'),

    postInflection: computed('tag.count.posts', function () {
        return this.get('tag.count.posts') > 1 ? 'posts' : 'post';
    }),

    actions: {
        confirm() {
            this.set('submitting', true);

            invokeAction(this, 'confirm').finally(() => {
                this.send('closeModal');
            });
        }
    }
});
