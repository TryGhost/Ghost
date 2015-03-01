define("ember-mocha",
  ["ember-mocha/describe-module","ember-mocha/describe-component","ember-mocha/describe-model","ember-mocha/it","ember-test-helpers","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var describeModule = __dependency1__["default"];
    var describeComponent = __dependency2__["default"];
    var describeModel = __dependency3__["default"];
    var it = __dependency4__["default"];
    var setResolver = __dependency5__.setResolver;

    __exports__.describeModule = describeModule;
    __exports__.describeComponent = describeComponent;
    __exports__.describeModel = describeModel;
    __exports__.it = it;
    __exports__.setResolver = setResolver;
  });
;define("ember-mocha/describe-module",
  ["ember-mocha/mocha-module","ember-test-helpers","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var createModule = __dependency1__.createModule;
    var TestModule = __dependency2__.TestModule;

    __exports__["default"] = function describeModule(name, description, callbacks, tests) {
      createModule(TestModule, name, description, callbacks, tests);
    }
  });
;define("ember-mocha/mocha-module",
  ["ember","ember-test-helpers","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    var getContext = __dependency2__.getContext;

    function createModule(Constructor, name, description, callbacks, tests) {
      var module;

      if (!tests) {
        if (!callbacks) {
          tests = description;
          callbacks = {};
        } else {
          tests = callbacks;
          callbacks = description;
        }
        module = new Constructor(name, callbacks);

      } else {
        module = new Constructor(name, description, callbacks);
      }

      describe(module.name, function() {
        beforeEach(function() {
          module.setup();
          var context = getContext();
          var keys = Ember.keys(context);
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            this[key] = context[key];
          }
        });

        afterEach(function() {
          module.teardown();
        });

        tests();
      });
    }

    __exports__.createModule = createModule;
  });
;define("ember-test-helpers",
  ["ember","ember-test-helpers/isolated-container","ember-test-helpers/test-module","ember-test-helpers/test-module-for-component","ember-test-helpers/test-module-for-model","ember-test-helpers/test-context","ember-test-helpers/test-resolver","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    var isolatedContainer = __dependency2__["default"];
    var TestModule = __dependency3__["default"];
    var TestModuleForComponent = __dependency4__["default"];
    var TestModuleForModel = __dependency5__["default"];
    var getContext = __dependency6__.getContext;
    var setContext = __dependency6__.setContext;
    var setResolver = __dependency7__.setResolver;

    Ember.testing = true;

    __exports__.isolatedContainer = isolatedContainer;
    __exports__.TestModule = TestModule;
    __exports__.TestModuleForComponent = TestModuleForComponent;
    __exports__.TestModuleForModel = TestModuleForModel;
    __exports__.getContext = getContext;
    __exports__.setContext = setContext;
    __exports__.setResolver = setResolver;
  });
;define("ember-test-helpers/isolated-container",
  ["ember-test-helpers/test-resolver","ember","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var getResolver = __dependency1__.getResolver;
    var Ember = __dependency2__["default"];

    __exports__["default"] = function isolatedContainer(fullNames) {
      var resolver = getResolver();
      var container = new Ember.Container();
      container.optionsForType('component', { singleton: false });
      container.optionsForType('view', { singleton: false });
      container.optionsForType('template', { instantiate: false });
      container.optionsForType('helper', { instantiate: false });
      container.register('component-lookup:main', Ember.ComponentLookup);
      for (var i = fullNames.length; i > 0; i--) {
        var fullName = fullNames[i - 1];
        var normalizedFullName = resolver.normalize(fullName);
        container.register(fullName, resolver.resolve(normalizedFullName));
      }
      return container;
    }
  });
;define("ember-test-helpers/test-resolver",
  ["exports"],
  function(__exports__) {
    "use strict";
    var __resolver__;

    function setResolver(resolver) {
      __resolver__ = resolver;
    }

    __exports__.setResolver = setResolver;function getResolver() {
      if (__resolver__ == null) throw new Error('you must set a resolver with `testResolver.set(resolver)`');
      return __resolver__;
    }

    __exports__.getResolver = getResolver;
  });
;define("ember-test-helpers/test-module",
  ["ember-test-helpers/isolated-container","ember-test-helpers/test-context","klassy","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var isolatedContainer = __dependency1__["default"];
    var getContext = __dependency2__.getContext;
    var setContext = __dependency2__.setContext;
    var Klass = __dependency3__.Klass;

    __exports__["default"] = Klass.extend({
      init: function(subjectName, description, callbacks) {
        // Allow `description` to be omitted, in which case it should
        // default to `subjectName`
        if (!callbacks && typeof description === 'object') {
          callbacks = description;
          description = subjectName;
        }

        this.subjectName = subjectName;
        this.description = description || subjectName;
        this.name = description || subjectName;
        this.callbacks = callbacks || {};

        this.initSubject();
        this.initNeeds();
        this.initSetupSteps();
        this.initTeardownSteps();
      },

      initSubject: function() {
        this.callbacks.subject = this.callbacks.subject || this.defaultSubject;
      },

      initNeeds: function() {
        this.needs = [this.subjectName];
        if (this.callbacks.needs) {
          this.needs = this.needs.concat(this.callbacks.needs)
          delete this.callbacks.needs;
        }
      },

      initSetupSteps: function() {
        this.setupSteps = [];

        if (this.callbacks.beforeSetup) {
          this.setupSteps.push( this.callbacks.beforeSetup );
          delete this.callbacks.beforeSetup;
        }

        this.setupSteps.push(this.setupContainer);
        this.setupSteps.push(this.setupContext);
        this.setupSteps.push(this.setupTestElements);

        if (this.callbacks.setup) {
          this.setupSteps.push( this.callbacks.setup );
          delete this.callbacks.setup;
        }
      },

      initTeardownSteps: function() {
        this.teardownSteps = [];

        if (this.callbacks.beforeTeardown) {
          this.teardownSteps.push( this.callbacks.beforeTeardown );
          delete this.callbacks.beforeTeardown;
        }

        this.teardownSteps.push(this.teardownContainer);
        this.teardownSteps.push(this.teardownContext);
        this.teardownSteps.push(this.teardownTestElements);

        if (this.callbacks.teardown) {
          this.teardownSteps.push( this.callbacks.teardown );
          delete this.callbacks.teardown;
        }
      },

      setup: function() {
        this.invokeSteps(this.setupSteps);
        this.contextualizeCallbacks();
      },

      teardown: function() {
        this.invokeSteps(this.teardownSteps);
        this.cache = null;
      },

      invokeSteps: function(steps) {
        for (var i = 0, l = steps.length; i < l; i++) {
          steps[i].call(this);
        }
      },

      setupContainer: function() {
        this.container = isolatedContainer(this.needs);
      },

      setupContext: function() {
        var subjectName = this.subjectName;
        var container = this.container;

        var factory = function() {
          return container.lookupFactory(subjectName);
        };

        setContext({
          container:  this.container,
          factory:    factory,
          dispatcher: null
        });

        this.context = getContext();
      },

      setupTestElements: function() {
        if (Ember.$('#ember-testing').length === 0) {
          Ember.$('<div id="ember-testing"/>').appendTo(document.body);
        }
      },

      teardownContainer: function() {
        var container = this.container;
        Ember.run(function() {
          container.destroy();
        });
      },

      teardownContext: function() {
        var context = this.context;
        if (context.dispatcher) {
          Ember.run(function() {
            context.dispatcher.destroy();
          });
        }
      },

      teardownTestElements: function() {
        Ember.$('#ember-testing').empty();
        Ember.View.views = {};
      },

      defaultSubject: function(options, factory) {
        return factory.create(options);
      },

      // allow arbitrary named factories, like rspec let
      contextualizeCallbacks: function() {
        var _this     = this;
        var callbacks = this.callbacks;
        var context   = this.context;
        var factory   = context.factory;

        this.cache = this.cache || {};

        var keys = Ember.keys(callbacks);

        for (var i = 0, l = keys.length; i < l; i++) {
          (function(key) {

            context[key] = function(options) {
              if (_this.cache[key]) { return _this.cache[key]; }

              var result = callbacks[key](options, factory());
              _this.cache[key] = result;

              return result;
            };

          })(keys[i]);
        }
      }
    });
  });
;define("ember-test-helpers/test-context",
  ["exports"],
  function(__exports__) {
    "use strict";
    var __test_context__;

    function setContext(context) {
      __test_context__ = context;
    }

    __exports__.setContext = setContext;function getContext() {
      return __test_context__;
    }

    __exports__.getContext = getContext;
  });
;define("klassy",
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
     Extend a class with the properties and methods of one or more other classes.

     When a method is replaced with another method, it will be wrapped in a
     function that makes the replaced method accessible via `this._super`.

     @method extendClass
     @param {Object} destination The class to merge into
     @param {Object} source One or more source classes
     */
    var extendClass = function(destination) {
      var sources = Array.prototype.slice.call(arguments, 1);
      var source;

      for (var i = 0, l = sources.length; i < l; i++) {
        source = sources[i];

        for (var p in source) {
          if (source.hasOwnProperty(p) &&
            destination[p] &&
            typeof destination[p] === 'function' &&
            typeof source[p] === 'function') {

            /* jshint loopfunc:true */
            destination[p] =
              (function(destinationFn, sourceFn) {
                var wrapper = function() {
                  var prevSuper = this._super;
                  this._super = destinationFn;

                  var ret = sourceFn.apply(this, arguments);

                  this._super = prevSuper;

                  return ret;
                };
                wrapper.wrappedFunction = sourceFn;
                return wrapper;
              })(destination[p], source[p]);

          } else {
            destination[p] = source[p];
          }
        }
      }
    };

    // `subclassing` is a state flag used by `defineClass` to track when a class is
    // being subclassed. It allows constructors to avoid calling `init`, which can
    // be expensive and cause undesirable side effects.
    var subclassing = false;

    /**
     Define a new class with the properties and methods of one or more other classes.

     The new class can be based on a `SuperClass`, which will be inserted into its
     prototype chain.

     Furthermore, one or more mixins (object that contain properties and/or methods)
     may be specified, which will be applied in order. When a method is replaced
     with another method, it will be wrapped in a function that makes the previous
     method accessible via `this._super`.

     @method defineClass
     @param {Object} SuperClass A base class to extend. If `mixins` are to be included
     without a `SuperClass`, pass `null` for SuperClass.
     @param {Object} mixins One or more objects that contain properties and methods
     to apply to the new class.
     */
    var defineClass = function(SuperClass) {
      var Klass = function() {
        if (!subclassing && this.init) {
          this.init.apply(this, arguments);
        }
      };

      if (SuperClass) {
        subclassing = true;
        Klass.prototype = new SuperClass();
        subclassing = false;
      }

      if (arguments.length > 1) {
        var extendArgs = Array.prototype.slice.call(arguments, 1);
        extendArgs.unshift(Klass.prototype);
        extendClass.apply(Klass.prototype, extendArgs);
      }

      Klass.constructor = Klass;

      Klass.extend = function() {
        var args = Array.prototype.slice.call(arguments, 0);
        args.unshift(Klass);
        return defineClass.apply(Klass, args);
      };

      return Klass;
    };

    /**
     A base class that can be extended.

     @example

     ```javascript
     var CelestialObject = Klass.extend({
       init: function(name) {
         this._super();
         this.name = name;
         this.isCelestialObject = true;
       },
       greeting: function() {
         return 'Hello from ' + this.name;
       }
     });

     var Planet = CelestialObject.extend({
       init: function(name) {
         this._super.apply(this, arguments);
         this.isPlanet = true;
       },
       greeting: function() {
         return this._super() + '!';
       },
     });

     var earth = new Planet('Earth');

     console.log(earth instanceof Klass);           // true
     console.log(earth instanceof CelestialObject); // true
     console.log(earth instanceof Planet);          // true

     console.log(earth.isCelestialObject);          // true
     console.log(earth.isPlanet);                   // true

     console.log(earth.greeting());                 // 'Hello from Earth!'
     ```

     @class Klass
     */
    var Klass = defineClass(null, {
      init: function() {}
    });

    __exports__.Klass = Klass;
    __exports__.defineClass = defineClass;
    __exports__.extendClass = extendClass;
  });
;define("ember-test-helpers/test-module-for-component",
  ["ember-test-helpers/test-module","ember","ember-test-helpers/test-resolver","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var TestModule = __dependency1__["default"];
    var Ember = __dependency2__["default"];
    var getResolver = __dependency3__.getResolver;

    __exports__["default"] = TestModule.extend({
      init: function(componentName, description, callbacks) {
        this.componentName = componentName;

        this._super.call(this, 'component:' + componentName, description, callbacks);

        this.setupSteps.push(this.setupComponent);
      },

      setupComponent: function() {
        var _this = this;
        var resolver = getResolver();
        var container = this.container;
        var context = this.context;

        var layoutName = 'template:components/' + this.componentName;

        var layout = resolver.resolve(layoutName);

        if (layout) {
          container.register(layoutName, layout);
          container.injection(this.subjectName, 'layout', layoutName);
        }

        context.dispatcher = Ember.EventDispatcher.create();
        context.dispatcher.setup({}, '#ember-testing');

        this.callbacks.render = function() {
          var containerView = Ember.ContainerView.create({container: container});
          var view = Ember.run(function(){
            var subject = context.subject();
            containerView.pushObject(subject);
            containerView.appendTo('#ember-testing');
            return subject;
          });

          _this.teardownSteps.push(function() {
            Ember.run(function() {
              Ember.tryInvoke(containerView, 'destroy');
            });
          });

          return view.$();
        };

        this.callbacks.append = function() {
          Ember.deprecate('this.append() is deprecated. Please use this.render() instead.');
          return this.render();
        };

        context.$ = function() {
          var $view = this.render();
          var subject = this.subject();

          if (arguments.length){
            return subject.$.apply(subject, arguments);
          } else {
            return $view;
          }
        };
      }
    });
  });
;define("ember-test-helpers/test-module-for-model",
  ["ember-test-helpers/test-module","ember","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var TestModule = __dependency1__["default"];
    var Ember = __dependency2__["default"];

    __exports__["default"] = TestModule.extend({
      init: function(modelName, description, callbacks) {
        this.modelName = modelName;

        this._super.call(this, 'model:' + modelName, description, callbacks);

        this.setupSteps.push(this.setupModel);
      },

      setupModel: function() {
        var container = this.container;
        var defaultSubject = this.defaultSubject;
        var callbacks = this.callbacks;
        var modelName = this.modelName;

        if (DS._setupContainer) {
          DS._setupContainer(container);
        } else {
          container.register('store:main', DS.Store);
        }

        var adapterFactory = container.lookupFactory('adapter:application');
        if (!adapterFactory) {
          container.register('adapter:application', DS.FixtureAdapter);
        }

        callbacks.store = function(){
          return container.lookup('store:main');
        };

        if (callbacks.subject === defaultSubject) {
          callbacks.subject = function(options) {
            return Ember.run(function() {
              return container.lookup('store:main').createRecord(modelName, options);
            });
          };
        }
      }
    });
  });
;define("ember-mocha/describe-component",
  ["ember-mocha/mocha-module","ember-test-helpers","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var createModule = __dependency1__.createModule;
    var TestModuleForComponent = __dependency2__.TestModuleForComponent;

    __exports__["default"] = function describeComponent(name, description, callbacks, tests) {
      createModule(TestModuleForComponent, name, description, callbacks, tests);
    }
  });
;define("ember-mocha/describe-model",
  ["ember-mocha/mocha-module","ember-test-helpers","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var createModule = __dependency1__.createModule;
    var TestModuleForModel = __dependency2__.TestModuleForModel;

    __exports__["default"] = function describeModel(name, description, callbacks, tests) {
      createModule(TestModuleForModel, name, description, callbacks, tests);
    }
  });
;define("ember-mocha/it",
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];

    function resetViews() {
      Ember.View.views = {};
    }

    var originalIt = window.it;

    function wrap(specifier) {
      return function (testName, callback) {
        var wrapper;

        if (!callback) {
          wrapper = null;
        } else if (callback.length === 1) {
          wrapper = function(done) {
            resetViews();
            return callback.call(this, done);
          };
        } else {
          wrapper = function() {
            resetViews();
            return callback.call(this);
          };
        }
        return specifier(testName, wrapper);
      };
    }

    var wrappedIt = wrap(window.it);
    wrappedIt.only = wrap(window.it.only);
    wrappedIt.skip = function(testName, callback) {
      originalIt(testName);
    };

    __exports__["default"] = wrappedIt;
  });