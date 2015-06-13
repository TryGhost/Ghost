import Ember from 'ember';
import EditorControllerMixin from 'ghost/mixins/editor-base-controller';

export default Ember.Controller.extend(EditorControllerMixin, {
    actions: {
        openDeleteModal: function () {
            this.send('openModal', 'delete-post', this.get('model'));
        }
    }
});
