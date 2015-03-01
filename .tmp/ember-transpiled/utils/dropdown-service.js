define("ghost/utils/dropdown-service", 
  ["ghost/mixins/body-event-listener","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    // This is used by the dropdown initializer (and subsequently popovers) to manage closing & toggling
    var BodyEventListener = __dependency1__["default"];

    var DropdownService = Ember.Object.extend(Ember.Evented, BodyEventListener, {
        bodyClick: function (event) {
            /*jshint unused:false */
            this.closeDropdowns();
        },
        closeDropdowns: function () {
            this.trigger('close');
        },
        toggleDropdown: function (dropdownName, dropdownButton) {
            this.trigger('toggle', {target: dropdownName, button: dropdownButton});
        }
    });

    __exports__["default"] = DropdownService;
  });