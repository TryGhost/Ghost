define("ghost/helpers/gh-count-down-characters", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var countDownCharacters = Ember.Handlebars.makeBoundHelper(function (content, maxCharacters) {
        var el = document.createElement('span'),
            length = content ? content.length : 0;

        el.className = 'word-count';

        if (length > maxCharacters) {
            el.style.color = '#E25440';
        } else {
            el.style.color = '#9FBB58';
        }

        el.innerHTML = length;

        return new Ember.Handlebars.SafeString(el.outerHTML);
    });

    __exports__["default"] = countDownCharacters;
  });