// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: Copyright 2013 Stefan Penner and Ember App Kit Contributors
// License:   Licensed under MIT license
//            See https://raw.github.com/stefanpenner/ember-jj-abrams-resolver/master/LICENSE
// ==========================================================================


var JSHINTRC = {
    "predef": [
        "console",
        "Ember",
        "DS",
        "Handlebars",
        "Metamorph",
        "ember_assert",
        "ember_warn",
        "ember_deprecate",
        "ember_deprecateFunc",
        "require",
        "equal",
        "asyncTest",
        "test",
        "raises",
        "deepEqual",
        "start",
        "stop",
        "ok",
        "strictEqual",
        "module",
        "expect",
        "minispade",
        "async",
        "invokeAsync",
        "expectAssertion",
        "expectDeprecation",
        "expectNoDeprecation",
        "throws"
    ],

    "node" : false,
    "es5" : true,
    "browser" : true,

    "boss" : true,
    "curly": false,
    "debug": false,
    "devel": false,
    "eqeqeq": true,
    "evil": true,
    "forin": false,
    "immed": false,
    "laxbreak": false,
    "newcap": true,
    "noarg": true,
    "noempty": false,
    "nonew": false,
    "nomen": false,
    "onevar": false,
    "plusplus": false,
    "regexp": false,
    "undef": true,
    "sub": true,
    "strict": false,
    "white": false
}
;

minispade.register('ember-resolver/~tests/container_debug_adapter_test', "(function() {/*globals define registry requirejs */\n\nvar resolver,\n    containerDebugAdapter,\n    App, get = Ember.get,\n    set = Ember.set,\n    Resolver = require('ember/resolver'),\n    ContainerDebugAdapter = require('ember/container-debug-adapter'),\n    Model = Ember.Object.extend();\n\n\nmodule(\"Container Debug Adapter Tests\", {\n  setup:function() {\n    Ember.run(function() {\n      App = Ember.Application.extend({\n        init: function () {\n            this.deferReadiness();\n            this._super.apply(this, arguments);\n        },\n        toString: function() { return 'App'; },\n        modulePrefix: 'appkit',\n        Resolver: Resolver['default'],\n        ContainerDebugAdapter: ContainerDebugAdapter['default']\n      }).create();\n\n      // App.__container__.register('container-debug-adapter:main', ContainerDebugAdapter);\n    });\n    Ember.run(function() {\n      containerDebugAdapter = App.__container__.lookup('container-debug-adapter:main');\n    });\n  },\n  teardown: function() {\n    Ember.run(function() {\n      containerDebugAdapter.destroy();\n      App.destroy();\n      App = null;\n    });\n  }\n});\n\ntest(\"can access Container Debug Adapter which can catalog typical entries by type\", function(){\n  equal(containerDebugAdapter.canCatalogEntriesByType('model'), true, \"canCatalogEntriesByType should return false for model\");\n  equal(containerDebugAdapter.canCatalogEntriesByType('template'), true, \"canCatalogEntriesByType should return false for template\");\n  equal(containerDebugAdapter.canCatalogEntriesByType('controller'), true, \"canCatalogEntriesByType should return true for controller\");\n  equal(containerDebugAdapter.canCatalogEntriesByType('route'), true, \"canCatalogEntriesByType should return true for route\");\n  equal(containerDebugAdapter.canCatalogEntriesByType('view'), true, \"canCatalogEntriesByType should return true for view\");\n});\n\ntest(\"the default ContainerDebugAdapter catalogs controller entries\", function(){\n  define('appkit/controllers/foo', [ ] , function(){  return Ember.ObjectController.extend(); });\n\n\n  var controllerClasses = containerDebugAdapter.catalogEntriesByType('controller');\n\n  equal(controllerClasses.length, 1, \"found 1 class\");\n  equal(controllerClasses[0], 'foo', \"found the right class\");\n});\n\n})();\n//@ sourceURL=ember-resolver/~tests/container_debug_adapter_test");minispade.register('ember-resolver/~tests/core_test', "(function() {/*globals define registry requirejs */\n\nvar Resolver, resolver;\n\nfunction lookupResolver() {\n  return requirejs.entries['ember/resolver'];\n}\n\nfunction resetRegistry() {\n  var keeper = lookupResolver();\n\n  requirejs.clear();\n  define('ember/resolver', keeper['deps'], keeper['callback']);\n}\n\nfunction setupResolver(options) {\n  if (!options) {\n    options = { namespace: { modulePrefix: 'appkit' } };\n  }\n\n  Resolver = require('ember/resolver')['default'];\n  resolver = Resolver.create(options);\n}\n\nmodule(\"Resolver Tests\",{\n  setup: function(){\n    setupResolver();\n  },\n\n  teardown: function() {\n    resetRegistry();\n    Ember.TEMPLATES = {};\n  }\n});\n\ntest(\"can access at deprecated 'resolver' module name\", function(){\n  expect(2);\n\n  expectDeprecation(/Importing\\/requiring Ember Resolver as \"resolver\" is deprecated, please use \"ember\\/resolver\" instead/);\n\n  var ResolverAlias = require('resolver')['default'];\n\n  equal(Resolver, ResolverAlias, \"both 'ember/resolver' and 'resolver' return the same Resolver\");\n});\n\ntest(\"can access Resolver\", function(){\n  ok(resolver);\n});\n\ntest(\"can lookup something\", function(){\n  expect(2);\n\n  define('appkit/adapters/post', [], function(){\n    ok(true, \"adapter was invoked properly\");\n\n    return Ember.K;\n  });\n\n  var adapter = resolver.resolve('adapter:post');\n\n  ok(adapter, 'adapter was returned');\n\n  adapter();\n});\n\ntest(\"will return the raw value if no 'default' is available\", function() {\n  define('appkit/fruits/orange', [], function(){\n    return 'is awesome';\n  });\n\n  equal(resolver.resolve('fruit:orange'), 'is awesome', 'adapter was returned');\n});\n\ntest(\"will unwrap the 'default' export automatically\", function(){\n  define('appkit/fruits/orange', [], function(){\n    return {default: 'is awesome'};\n  });\n\n  equal(resolver.resolve('fruit:orange'), 'is awesome', 'adapter was returned');\n});\n\ntest(\"router:main is hard-coded to prefix/router.js\", function() {\n  expect(1);\n\n  define('appkit/router', [], function(){\n    ok(true, 'router:main was looked up');\n    return 'whatever';\n  });\n\n  resolver.resolve('router:main');\n});\n\ntest(\"store:main is looked up as prefix/store\", function() {\n  expect(1);\n\n  define('appkit/store', [], function(){\n    ok(true, 'store:main was looked up');\n    return 'whatever';\n  });\n\n  resolver.resolve('store:main');\n});\n\ntest(\"store:posts as prefix/stores/post\", function() {\n  expect(1);\n\n  define('appkit/stores/post', [], function(){\n    ok(true, 'store:post was looked up');\n    return 'whatever';\n  });\n\n  resolver.resolve('store:post');\n});\n\ntest(\"will raise error if both dasherized and underscored modules exist\", function() {\n  define('appkit/big-bands/steve-miller-band', [], function(){\n    ok(true, 'dasherized version looked up');\n    return 'whatever';\n  });\n\n  define('appkit/big_bands/steve_miller_band', [], function(){\n    ok(false, 'underscored version looked up');\n    return 'whatever';\n  });\n\n  try {\n    resolver.resolve('big-band:steve-miller-band');\n  } catch (e) {\n    equal(e.message, 'Ambiguous module names: `appkit/big-bands/steve-miller-band` and `appkit/big_bands/steve_miller_band`', \"error with a descriptive value is thrown\");\n  }\n});\n\ntest(\"will lookup an underscored version of the module name when the dasherized version is not found\", function() {\n  expect(1);\n\n  define('appkit/big_bands/steve_miller_band', [], function(){\n    ok(true, 'underscored version looked up properly');\n    return 'whatever';\n  });\n\n  resolver.resolve('big-band:steve-miller-band');\n});\n\ntest(\"can lookup templates with mixed naming moduleName\", function(){\n  expectDeprecation('Modules should not contain underscores. Attempted to lookup \"appkit/bands/-steve-miller-band\" which was not found. Please rename \"appkit/bands/_steve-miller-band\" to \"appkit/bands/-steve-miller-band\" instead.');\n\n  expect(2);\n\n  define('appkit/bands/_steve-miller-band', [], function(){\n    ok(true, 'underscored version looked up properly');\n    return 'whatever';\n  });\n\n  resolver.resolve('band:-steve-miller-band');\n});\n\ntest(\"can lookup templates via Ember.TEMPLATES\", function() {\n  Ember.TEMPLATES['application'] = function() {\n    return '<h1>herp</h1>';\n  };\n\n  var template = resolver.resolve('template:application');\n  ok(template, 'template should resolve');\n});\n\nmodule(\"custom prefixes by type\", {\n  teardown: resetRegistry\n});\n\ntest(\"will use the prefix specified for a given type if present\", function() {\n  setupResolver({ namespace: {\n    fruitPrefix: 'grovestand',\n    modulePrefix: 'appkit'\n  }});\n\n  define('grovestand/fruits/orange', [], function(){\n    ok(true, 'custom prefix used');\n    return 'whatever';\n  });\n\n  resolver.resolve('fruit:orange');\n});\n\nmodule(\"pods lookup structure\", {\n  setup: function() {\n    setupResolver();\n  },\n\n  teardown: resetRegistry\n});\n\ntest(\"will lookup modulePrefix/name/type before prefix/type/name\", function() {\n  define('appkit/controllers/foo', [], function(){\n    ok(false, 'appkit/controllers was used');\n    return 'whatever';\n  });\n\n  define('appkit/foo/controller', [], function(){\n    ok(true, 'appkit/foo/controllers was used');\n    return 'whatever';\n  });\n\n  resolver.resolve('controller:foo');\n});\n\ntest(\"will lookup names with slashes properly\", function() {\n  define('appkit/controllers/foo/index', [], function(){\n    ok(false, 'appkit/controllers was used');\n    return 'whatever';\n  });\n\n  define('appkit/foo/index/controller', [], function(){\n    ok(true, 'appkit/foo/index/controller was used');\n    return 'whatever';\n  });\n\n  resolver.resolve('controller:foo/index');\n});\n\ntest(\"specifying a podModulePrefix overrides the general modulePrefix\", function() {\n  setupResolver({\n    namespace: {\n      modulePrefix: 'appkit',\n      podModulePrefix: 'appkit/pods'\n    }\n  });\n\n  define('appkit/controllers/foo', [], function(){\n    ok(false, 'appkit/controllers was used');\n    return 'whatever';\n  });\n\n  define('appkit/foo/controller', [], function(){\n    ok(false, 'appkit/foo/controllers was used');\n    return 'whatever';\n  });\n\n  define('appkit/pods/foo/controller', [], function(){\n    ok(true, 'appkit/pods/foo/controllers was used');\n    return 'whatever';\n  });\n\n  resolver.resolve('controller:foo');\n});\n\ntest(\"will not use custom type prefix when using POD format\", function() {\n  resolver.namespace['controllerPrefix'] = 'foobar';\n\n  define('foobar/controllers/foo', [], function(){\n    ok(false, 'foobar/controllers was used');\n    return 'whatever';\n  });\n\n  define('foobar/foo/controller', [], function(){\n    ok(false, 'foobar/foo/controllers was used');\n    return 'whatever';\n  });\n\n  define('appkit/foo/controller', [], function(){\n    ok(true, 'appkit/foo/controllers was used');\n    return 'whatever';\n  });\n\n  resolver.resolve('controller:foo');\n});\n})();\n//@ sourceURL=ember-resolver/~tests/core_test");