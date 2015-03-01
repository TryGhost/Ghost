define("ghost/utils/ctrl-or-cmd", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var ctrlOrCmd = navigator.userAgent.indexOf('Mac') !== -1 ? 'command' : 'ctrl';

    __exports__["default"] = ctrlOrCmd;
  });