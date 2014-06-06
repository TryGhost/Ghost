import EditorControllerMixin from 'ghost/mixins/editor-base-controller';
import MarkerManager from 'ghost/mixins/marker-manager';

var EditorNewController = Ember.ObjectController.extend(EditorControllerMixin, MarkerManager, {
    init: function () {
        var self = this;

        this._super();

        window.onbeforeunload = function () {
            return self.get('isDirty') ? self.unloadDirtyMessage() : null;
        };
    },

    actions: {
        /**
          * Redirect to editor after the first save
          */
        save: function () {
            var self = this;
            this._super().then(function (model) {
                if (model.get('id')) {
                    self.transitionTo('editor.edit', model);
                }
                return model;
            });
        }
    }
});

export default EditorNewController;
