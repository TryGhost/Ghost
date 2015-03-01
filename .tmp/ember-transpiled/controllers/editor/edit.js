define("ghost/controllers/editor/edit", 
  ["ghost/mixins/editor-base-controller","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EditorControllerMixin = __dependency1__["default"];

    var EditorEditController = Ember.Controller.extend(EditorControllerMixin);

    __exports__["default"] = EditorEditController;
  });