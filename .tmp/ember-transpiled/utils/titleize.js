define("ghost/utils/titleize", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var lowerWords = ['of', 'a', 'the', 'and', 'an', 'or', 'nor', 'but', 'is', 'if',
                      'then', 'else', 'when', 'at', 'from', 'by', 'on', 'off', 'for',
                      'in', 'out', 'over', 'to', 'into', 'with'];

    function titleize(input) {
        var words = input.split(' ').map(function (word, index) {
            if (index === 0 || lowerWords.indexOf(word) === -1) {
                word = Ember.String.capitalize(word);
            }

            return word;
        });

        return words.join(' ');
    }

    __exports__["default"] = titleize;
  });