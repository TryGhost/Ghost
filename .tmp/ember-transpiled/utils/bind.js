define("ghost/utils/bind", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var slice = Array.prototype.slice;

    function bind(/* func, args, thisArg */) {
        var args = slice.call(arguments),
            func = args.shift(),
            thisArg = args.pop();

        function bound() {
            return func.apply(thisArg, args);
        }

        return bound;
    }

    __exports__["default"] = bind;
  });