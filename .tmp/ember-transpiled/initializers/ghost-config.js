define("ghost/initializers/ghost-config", 
  ["ghost/utils/config-parser","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var getConfig = __dependency1__["default"];

    var ConfigInitializer = {
        name: 'config',

        initialize: function (container, application) {
            var config = getConfig();
            application.register('ghost:config', config, {instantiate: false});

            application.inject('route', 'config', 'ghost:config');
            application.inject('controller', 'config', 'ghost:config');
            application.inject('component', 'config', 'ghost:config');
        }
    };

    __exports__["default"] = ConfigInitializer;
  });