define("ghost/utils/validator-extensions", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function init() {
        // Provide a few custom validators
        //
        validator.extend('empty', function (str) {
            return Ember.isBlank(str);
        });

        validator.extend('notContains', function (str, badString) {
            return str.indexOf(badString) === -1;
        });
    }

    __exports__["default"] = {
        init: init
    };
  });