define("ghost/mixins/dropdown-mixin", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*
      Dropdowns and their buttons are evented and do not propagate clicks.
    */
    var DropdownMixin = Ember.Mixin.create(Ember.Evented, {
        classNameBindings: ['isOpen:open:closed'],
        isOpen: false,

        click: function (event) {
            this._super(event);

            return event.stopPropagation();
        }
    });

    __exports__["default"] = DropdownMixin;
  });