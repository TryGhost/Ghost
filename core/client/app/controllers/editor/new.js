import EditorControllerMixin from 'ghost/mixins/editor-base-controller';

var EditorNewController = Ember.Controller.extend(EditorControllerMixin, {
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
