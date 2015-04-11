import Ember from 'ember';
import EditorControllerMixin from 'ghost/mixins/editor-base-controller';

var EditorNewController = Ember.Controller.extend(EditorControllerMixin, {
    // Overriding autoSave on the base controller, as the new controller shouldn't be autosaving
    autoSave: Ember.K,
    actions: {
        /**
          * Redirect to editor after the first save
          */
        save: function (options) {
            var self = this;
            return this._super(options).then(function (model) {
                if (model.get('id')) {
                    self.replaceRoute('editor.edit', model);
                }
            });
        }
    }
});

export default EditorNewController;
