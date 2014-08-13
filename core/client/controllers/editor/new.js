import EditorControllerMixin from 'ghost/mixins/editor-base-controller';

var EditorNewController = Ember.ObjectController.extend(EditorControllerMixin, {
    actions: {
        /**
          * Redirect to editor after the first save
          */
        save: function () {
            var self = this;
            this._super().then(function (model) {
                if (model.get('id')) {
                    self.transitionToRoute('editor.edit', model);
                }
            }).catch(function () {
                // Publishing failed
                self.set('status', 'draft');
            });
        }
    }
});

export default EditorNewController;
