import Ember from 'ember';
import EditorControllerMixin from 'ghost/mixins/editor-base-controller';

const {Controller} = Ember;

export default Controller.extend(EditorControllerMixin, {
    actions: {
        openDeleteModal() {
            this.send('openModal', 'delete-post', this.get('model'));
        }
    }
});
