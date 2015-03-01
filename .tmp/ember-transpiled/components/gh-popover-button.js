define("ghost/components/gh-popover-button", 
  ["ghost/components/gh-dropdown-button","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var DropdownButton = __dependency1__["default"];

    var PopoverButton = DropdownButton.extend({
        click: Ember.K, // We don't want clicks on popovers, but dropdowns have them. So `K`ill them here.

        mouseEnter: function (event) {
            this._super(event);
            this.get('dropdown').toggleDropdown(this.get('popoverName'), this);
        },

        mouseLeave: function (event) {
            this._super(event);
            this.get('dropdown').toggleDropdown(this.get('popoverName'), this);
        }
    });

    __exports__["default"] = PopoverButton;
  });