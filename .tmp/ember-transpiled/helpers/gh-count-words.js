define("ghost/helpers/gh-count-words", 
  ["ghost/utils/word-count","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var counter = __dependency1__["default"];

    var countWords = Ember.Handlebars.makeBoundHelper(function (markdown) {
        if (/^\s*$/.test(markdown)) {
            return '0 个字';
        }

        var count = counter(markdown || '');

        return count + (count === 1 ? ' 个字' : ' 个字');

    });

    __exports__["default"] = countWords;
  });