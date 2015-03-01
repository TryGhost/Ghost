define("ghost/views/editor/edit", 
  ["ghost/mixins/editor-base-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EditorViewMixin = __dependency1__["default"];

    var EditorView = Ember.View.extend(EditorViewMixin, {
        tagName: 'section',
        classNames: ['entry-container']
    });

    __exports__["default"] = EditorView;
  });