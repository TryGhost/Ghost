define("ghost/initializers/ghost-paths", 
  ["ghost/utils/ghost-paths","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ghostPaths = __dependency1__["default"];

    var ghostPathsInitializer = {
        name: 'ghost-paths',
        after: 'store',

        initialize: function (container, application) {
            application.register('ghost:paths', ghostPaths(), {instantiate: false});

            application.inject('route', 'ghostPaths', 'ghost:paths');
            application.inject('model', 'ghostPaths', 'ghost:paths');
            application.inject('controller', 'ghostPaths', 'ghost:paths');
        }
    };

    __exports__["default"] = ghostPathsInitializer;
  });