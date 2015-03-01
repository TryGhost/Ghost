define("ghost/components/gh-dropdown-button", 
  ["ghost/mixins/dropdown-mixin","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var DropdownMixin = __dependency1__["default"];

    var DropdownButton = Ember.Component.extend(DropdownMixin, {
        tagName: 'button',

        // matches with the dropdown this button toggles
        dropdownName: null,

        // Notify dropdown service this dropdown should be toggled
        click: function (event) {
            this._super(event);
            this.get('dropdown').toggleDropdown(this.get('dropdownName'), this);
        }
    });

    __exports__["default"] = DropdownButton;
  });