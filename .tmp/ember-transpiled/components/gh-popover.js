define("ghost/components/gh-popover", 
  ["ghost/components/gh-dropdown","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var GhostDropdown = __dependency1__["default"];

    var GhostPopover = GhostDropdown.extend({
        classNames: 'ghost-popover'
    });

    __exports__["default"] = GhostPopover;
  });