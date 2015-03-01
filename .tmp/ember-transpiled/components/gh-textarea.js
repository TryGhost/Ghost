define("ghost/components/gh-textarea", 
  ["ghost/mixins/text-input","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var TextInputMixin = __dependency1__["default"];

    var TextArea = Ember.TextArea.extend(TextInputMixin);

    __exports__["default"] = TextArea;
  });