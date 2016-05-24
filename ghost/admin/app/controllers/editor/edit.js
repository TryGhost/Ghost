import Ember from 'ember';
import EditorControllerMixin from 'ghost-admin/mixins/editor-base-controller';

const {Controller} = Ember;

export default Controller.extend(EditorControllerMixin, {
    showDeletePostModal: false,

    actions: {
        toggleDeletePostModal() {
            this.toggleProperty('showDeletePostModal');
        }
    }
});
