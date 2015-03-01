define("ghost/tests/test-helper", 
  ["ember-cli/test-loader","ember/resolver","ember-mocha"],
  function(__dependency1__, __dependency2__, __dependency3__) {
    "use strict";
    var TestLoader = __dependency1__["default"];
    var Resolver = __dependency2__["default"];
    var setResolver = __dependency3__.setResolver;

    var resolver = Resolver.create();
    resolver.namespace = {
      modulePrefix: 'ghost'
    };

    setResolver(resolver);

    TestLoader.load();

    window.expect = chai.expect;

    mocha.checkLeaks();
    mocha.globals(['jQuery', 'EmberInspector']);
    mocha.run();
  });