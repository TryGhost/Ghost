define("ghost/initializers/dropdown", 
  ["ghost/utils/dropdown-service","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var DropdownService = __dependency1__["default"];

    var dropdownInitializer = {
        name: 'dropdown',

        initialize: function (container, application) {
            application.register('dropdown:service', DropdownService);

            // Inject dropdowns
            application.inject('component:gh-dropdown', 'dropdown', 'dropdown:service');
            application.inject('component:gh-dropdown-button', 'dropdown', 'dropdown:service');
            application.inject('controller:modals.delete-post', 'dropdown', 'dropdown:service');
            application.inject('controller:modals.transfer-owner', 'dropdown', 'dropdown:service');
            application.inject('route:application', 'dropdown', 'dropdown:service');

            // Inject popovers
            application.inject('component:gh-popover', 'dropdown', 'dropdown:service');
            application.inject('component:gh-popover-button', 'dropdown', 'dropdown:service');
            application.inject('route:application', 'dropdown', 'dropdown:service');
        }
    };

    __exports__["default"] = dropdownInitializer;
  });