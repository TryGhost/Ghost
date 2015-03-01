define("ghost/controllers/editor/new", 
  ["ghost/mixins/editor-base-controller","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EditorControllerMixin = __dependency1__["default"];

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

    __exports__["default"] = EditorNewController;
  });