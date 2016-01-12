import Ember from 'ember';
import ModalComponent from 'ghost/components/modals/base';

const {computed} = Ember;
const {alias} = computed;

export default ModalComponent.extend({

    submitting: false,

    tag: alias('model'),

    postInflection: computed('tag.count.posts', function () {
        return this.get('tag.count.posts') > 1 ? 'posts' : 'post';
    }),

    actions: {
        confirm() {
            this.set('submitting', true);

            this.attrs.confirm().finally(() => {
                this.send('closeModal');
            });
        }
    }
});
