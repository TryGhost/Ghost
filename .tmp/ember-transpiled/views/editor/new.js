define("ghost/views/editor/new", 
  ["ghost/mixins/editor-base-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EditorViewMixin = __dependency1__["default"];

    var EditorNewView = Ember.View.extend(EditorViewMixin, {
        tagName: 'section',
        templateName: 'editor/edit',
        classNames: ['entry-container']
    });

    __exports__["default"] = EditorNewView;
  });