define("ghost/app", 
  ["ember/resolver","ember/load-initializers","ghost/utils/link-view","ghost/utils/text-field","ghost/config","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var Resolver = __dependency1__["default"];
    var loadInitializers = __dependency2__["default"];
    var configureApp = __dependency5__["default"];

    Ember.MODEL_FACTORY_INJECTIONS = true;

    var App = Ember.Application.extend({
        modulePrefix: 'ghost',
        Resolver: Resolver['default']
    });

    // Runtime configuration of Ember.Application
    configureApp(App);

    loadInitializers(App, 'ghost');

    __exports__["default"] = App;
  });