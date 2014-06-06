import EditorControllerMixin from 'ghost/mixins/editor-base-controller';
import MarkerManager from 'ghost/mixins/marker-manager';

var EditorEditController = Ember.ObjectController.extend(EditorControllerMixin, MarkerManager, {
    init: function () {
        var self = this;

        this._super();

        window.onbeforeunload = function () {
            return self.get('isDirty') ? self.unloadDirtyMessage() : null;
        };
    }
});

export default EditorEditController;
