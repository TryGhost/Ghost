define("ghost/initializers/store-injector", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var StoreInjector = {
        name: 'store-injector',
        after: 'store',

        initialize: function (container, application) {
            application.inject('component:gh-role-selector', 'store', 'store:main');
        }
    };

    __exports__["default"] = StoreInjector;
  });