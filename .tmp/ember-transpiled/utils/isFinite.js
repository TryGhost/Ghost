define("ghost/utils/isFinite", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /* globals window */

    // isFinite function from lodash

    function isFinite(value) {
        return window.isFinite(value) && !window.isNaN(parseFloat(value));
    }

    __exports__["default"] = isFinite;
  });