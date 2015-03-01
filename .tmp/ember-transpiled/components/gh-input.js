define("ghost/components/gh-input", 
  ["ghost/mixins/text-input","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var TextInputMixin = __dependency1__["default"];

    var Input = Ember.TextField.extend(TextInputMixin);

    __exports__["default"] = Input;
  });