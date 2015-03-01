/*!
 * @overview  Ember - JavaScript Application Framework
 * @copyright Copyright 2011-2014 Tilde Inc. and contributors
 *            Portions Copyright 2006-2011 Strobe Inc.
 *            Portions Copyright 2008-2011 Apple Inc. All rights reserved.
 * @license   Licensed under MIT license
 *            See https://raw.github.com/emberjs/ember.js/master/LICENSE
 * @version   1.9.0
 */

(function() {
var enifed, requireModule, eriuqer, requirejs, Ember;

(function() {
  Ember = this.Ember = this.Ember || {};
  if (typeof Ember === 'undefined') { Ember = {}; };
  function UNDEFINED() { }

  if (typeof Ember.__loader === 'undefined') {
    var registry = {}, seen = {};

    enifed = function(name, deps, callback) {
      registry[name] = { deps: deps, callback: callback };
    };

    requirejs = eriuqer = requireModule = function(name) {
      var s = seen[name];

      if (s !== undefined) { return seen[name]; }
      if (s === UNDEFINED) { return undefined;  }

      seen[name] = {};

      if (!registry[name]) {
        throw new Error("Could not find module " + name);
      }

      var mod = registry[name];
      var deps = mod.deps;
      var callback = mod.callback;
      var reified = [];
      var exports;
      var length = deps.length;

      for (var i=0; i<length; i++) {
        if (deps[i] === 'exports') {
          reified.push(exports = {});
        } else {
          reified.push(requireModule(resolve(deps[i], name)));
        }
      }

      var value = length === 0 ? callback.call(this) : callback.apply(this, reified);

      return seen[name] = exports || (value === undefined ? UNDEFINED : value);
    };

    function resolve(child, name) {
      if (child.charAt(0) !== '.') { return child; }
      var parts = child.split("/");
      var parentBase = name.split("/").slice(0, -1);

      for (var i=0, l=parts.length; i<l; i++) {
        var part = parts[i];

        if (part === '..') { parentBase.pop(); }
        else if (part === '.') { continue; }
        else { parentBase.push(part); }
      }

      return parentBase.join("/");
    }

    requirejs._eak_seen = registry;

    Ember.__loader = {define: enifed, require: eriuqer, registry: registry};
  } else {
    enifed = Ember.__loader.define;
    requirejs = eriuqer = requireModule = Ember.__loader.require;
  }
})();

enifed("ember-debug",
  ["ember-metal/core","ember-metal/error","ember-metal/logger","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    /*global __fail__*/

    var Ember = __dependency1__["default"];
    var EmberError = __dependency2__["default"];
    var Logger = __dependency3__["default"];

    /**
    Ember Debug

    @module ember
    @submodule ember-debug
    */

    /**
    @class Ember
    */

    /**
      Define an assertion that will throw an exception if the condition is not
      met. Ember build tools will remove any calls to `Ember.assert()` when
      doing a production build. Example:

      ```javascript
      // Test for truthiness
      Ember.assert('Must pass a valid object', obj);

      // Fail unconditionally
      Ember.assert('This code path should never be run');
      ```

      @method assert
      @param {String} desc A description of the assertion. This will become
        the text of the Error thrown if the assertion fails.
      @param {Boolean} test Must be truthy for the assertion to pass. If
        falsy, an exception will be thrown.
    */
    Ember.assert = function(desc, test) {
      if (!test) {
        throw new EmberError("Assertion Failed: " + desc);
      }
    };


    /**
      Display a warning with the provided message. Ember build tools will
      remove any calls to `Ember.warn()` when doing a production build.

      @method warn
      @param {String} message A warning to display.
      @param {Boolean} test An optional boolean. If falsy, the warning
        will be displayed.
    */
    Ember.warn = function(message, test) {
      if (!test) {
        Logger.warn("WARNING: "+message);
        if ('trace' in Logger) Logger.trace();
      }
    };

    /**
      Display a debug notice. Ember build tools will remove any calls to
      `Ember.debug()` when doing a production build.

      ```javascript
      Ember.debug('I\'m a debug notice!');
      ```

      @method debug
      @param {String} message A debug message to display.
    */
    Ember.debug = function(message) {
      Logger.debug("DEBUG: "+message);
    };

    /**
      Display a deprecation warning with the provided message and a stack trace
      (Chrome and Firefox only). Ember build tools will remove any calls to
      `Ember.deprecate()` when doing a production build.

      @method deprecate
      @param {String} message A description of the deprecation.
      @param {Boolean} test An optional boolean. If falsy, the deprecation
        will be displayed.
    */
    Ember.deprecate = function(message, test) {
      if (test) { return; }

      if (Ember.ENV.RAISE_ON_DEPRECATION) { throw new EmberError(message); }

      var error;

      // When using new Error, we can't do the arguments check for Chrome. Alternatives are welcome
      try { __fail__.fail(); } catch (e) { error = e; }

      if (Ember.LOG_STACKTRACE_ON_DEPRECATION && error.stack) {
        var stack;
        var stackStr = '';

        if (error['arguments']) {
          // Chrome
          stack = error.stack.replace(/^\s+at\s+/gm, '').
                              replace(/^([^\(]+?)([\n$])/gm, '{anonymous}($1)$2').
                              replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}($1)').split('\n');
          stack.shift();
        } else {
          // Firefox
          stack = error.stack.replace(/(?:\n@:0)?\s+$/m, '').
                              replace(/^\(/gm, '{anonymous}(').split('\n');
        }

        stackStr = "\n    " + stack.slice(2).join("\n    ");
        message = message + stackStr;
      }

      Logger.warn("DEPRECATION: "+message);
    };



    /**
      Alias an old, deprecated method with its new counterpart.

      Display a deprecation warning with the provided message and a stack trace
      (Chrome and Firefox only) when the assigned method is called.

      Ember build tools will not remove calls to `Ember.deprecateFunc()`, though
      no warnings will be shown in production.

      ```javascript
      Ember.oldMethod = Ember.deprecateFunc('Please use the new, updated method', Ember.newMethod);
      ```

      @method deprecateFunc
      @param {String} message A description of the deprecation.
      @param {Function} func The new function called to replace its deprecated counterpart.
      @return {Function} a new function that wrapped the original function with a deprecation warning
    */
    Ember.deprecateFunc = function(message, func) {
      return function() {
        Ember.deprecate(message);
        return func.apply(this, arguments);
      };
    };


    /**
      Run a function meant for debugging. Ember build tools will remove any calls to
      `Ember.runInDebug()` when doing a production build.

      ```javascript
      Ember.runInDebug(function() {
        Ember.Handlebars.EachView.reopen({
          didInsertElement: function() {
            console.log('I\'m happy');
          }
        });
      });
      ```

      @method runInDebug
      @param {Function} func The function to be executed.
      @since 1.5.0
    */
    Ember.runInDebug = function(func) {
      func();
    };

    /**
      Will call `Ember.warn()` if ENABLE_ALL_FEATURES, ENABLE_OPTIONAL_FEATURES, or
      any specific FEATURES flag is truthy.

      This method is called automatically in debug canary builds.
      
      @private
      @method _warnIfUsingStrippedFeatureFlags
      @return {void}
    */
    function _warnIfUsingStrippedFeatureFlags(FEATURES, featuresWereStripped) {
      if (featuresWereStripped) {
        Ember.warn('Ember.ENV.ENABLE_ALL_FEATURES is only available in canary builds.', !Ember.ENV.ENABLE_ALL_FEATURES);
        Ember.warn('Ember.ENV.ENABLE_OPTIONAL_FEATURES is only available in canary builds.', !Ember.ENV.ENABLE_OPTIONAL_FEATURES);

        for (var key in FEATURES) {
          if (FEATURES.hasOwnProperty(key) && key !== 'isEnabled') {
            Ember.warn('FEATURE["' + key + '"] is set as enabled, but FEATURE flags are only available in canary builds.', !FEATURES[key]);
          }
        }
      }
    }

    __exports__._warnIfUsingStrippedFeatureFlags = _warnIfUsingStrippedFeatureFlags;if (!Ember.testing) {
      // Complain if they're using FEATURE flags in builds other than canary
      Ember.FEATURES['features-stripped-test'] = true;
      var featuresWereStripped = true;
      
      
      delete Ember.FEATURES['features-stripped-test'];
      _warnIfUsingStrippedFeatureFlags(Ember.ENV.FEATURES, featuresWereStripped);

      // Inform the developer about the Ember Inspector if not installed.
      var isFirefox = typeof InstallTrigger !== 'undefined';
      var isChrome = !!window.chrome && !window.opera;

      if (typeof window !== 'undefined' && (isFirefox || isChrome) && window.addEventListener) {
        window.addEventListener("load", function() {
          if (document.documentElement && document.documentElement.dataset && !document.documentElement.dataset.emberExtension) {
            var downloadURL;

            if(isChrome) {
              downloadURL = 'https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi';
            } else if(isFirefox) {
              downloadURL = 'https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/';
            }

            Ember.debug('For more advanced debugging, install the Ember Inspector from ' + downloadURL);
          }
        }, false);
      }
    }
  });
enifed("ember-testing",
  ["ember-metal/core","ember-testing/initializers","ember-testing/support","ember-testing/setup_for_testing","ember-testing/test","ember-testing/adapters/adapter","ember-testing/adapters/qunit","ember-testing/helpers"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__) {
    "use strict";
    var Ember = __dependency1__["default"];

    // to setup initializer
         // to handle various edge cases

    var setupForTesting = __dependency4__["default"];
    var Test = __dependency5__["default"];
    var Adapter = __dependency6__["default"];
    var QUnitAdapter = __dependency7__["default"];
         // adds helpers to helpers object in Test

    /**
      Ember Testing

      @module ember
      @submodule ember-testing
      @requires ember-application
    */

    Ember.Test = Test;
    Ember.Test.Adapter = Adapter;
    Ember.Test.QUnitAdapter = QUnitAdapter;
    Ember.setupForTesting = setupForTesting;
  });
enifed("ember-testing/adapters/adapter",
  ["ember-metal/core","ember-runtime/system/object","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    // Ember.K
    var EmberObject = __dependency2__["default"];

    /**
     @module ember
     @submodule ember-testing
    */

    /**
      The primary purpose of this class is to create hooks that can be implemented
      by an adapter for various test frameworks.

      @class Adapter
      @namespace Ember.Test
    */
    var Adapter = EmberObject.extend({
      /**
        This callback will be called whenever an async operation is about to start.

        Override this to call your framework's methods that handle async
        operations.

        @public
        @method asyncStart
      */
      asyncStart: Ember.K,

      /**
        This callback will be called whenever an async operation has completed.

        @public
        @method asyncEnd
      */
      asyncEnd: Ember.K,

      /**
        Override this method with your testing framework's false assertion.
        This function is called whenever an exception occurs causing the testing
        promise to fail.

        QUnit example:

        ```javascript
          exception: function(error) {
            ok(false, error);
          };
        ```

        @public
        @method exception
        @param {String} error The exception to be raised.
      */
      exception: function(error) {
        throw error;
      }
    });

    __exports__["default"] = Adapter;
  });
enifed("ember-testing/adapters/qunit",
  ["ember-testing/adapters/adapter","ember-metal/utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Adapter = __dependency1__["default"];
    var inspect = __dependency2__.inspect;

    /**
      This class implements the methods defined by Ember.Test.Adapter for the
      QUnit testing framework.

      @class QUnitAdapter
      @namespace Ember.Test
      @extends Ember.Test.Adapter
    */
    __exports__["default"] = Adapter.extend({
      asyncStart: function() {
        QUnit.stop();
      },
      asyncEnd: function() {
        QUnit.start();
      },
      exception: function(error) {
        ok(false, inspect(error));
      }
    });
  });
enifed("ember-testing/helpers",
  ["ember-metal/property_get","ember-metal/error","ember-metal/run_loop","ember-views/system/jquery","ember-testing/test"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__) {
    "use strict";
    var get = __dependency1__.get;
    var EmberError = __dependency2__["default"];
    var run = __dependency3__["default"];
    var jQuery = __dependency4__["default"];
    var Test = __dependency5__["default"];

    /**
    * @module ember
    * @submodule ember-testing
    */

    var helper = Test.registerHelper;
    var asyncHelper = Test.registerAsyncHelper;
    var countAsync = 0;

    function currentRouteName(app){
      var appController = app.__container__.lookup('controller:application');

      return get(appController, 'currentRouteName');
    }

    function currentPath(app){
      var appController = app.__container__.lookup('controller:application');

      return get(appController, 'currentPath');
    }

    function currentURL(app){
      var router = app.__container__.lookup('router:main');

      return get(router, 'location').getURL();
    }

    function pauseTest(){
      Test.adapter.asyncStart();
      return new Ember.RSVP.Promise(function(){ }, 'TestAdapter paused promise');
    }

    function visit(app, url) {
      var router = app.__container__.lookup('router:main');
      router.location.setURL(url);

      if (app._readinessDeferrals > 0) {
        router['initialURL'] = url;
        run(app, 'advanceReadiness');
        delete router['initialURL'];
      } else {
        run(app, app.handleURL, url);
      }

      return app.testHelpers.wait();
    }

    function click(app, selector, context) {
      var $el = app.testHelpers.findWithAssert(selector, context);
      run($el, 'mousedown');

      if ($el.is(':input')) {
        var type = $el.prop('type');
        if (type !== 'checkbox' && type !== 'radio' && type !== 'hidden') {
          run($el, function(){
            // Firefox does not trigger the `focusin` event if the window
            // does not have focus. If the document doesn't have focus just
            // use trigger('focusin') instead.
            if (!document.hasFocus || document.hasFocus()) {
              this.focus();
            } else {
              this.trigger('focusin');
            }
          });
        }
      }

      run($el, 'mouseup');
      run($el, 'click');

      return app.testHelpers.wait();
    }

    function triggerEvent(app, selector, contextOrType, typeOrOptions, possibleOptions){
      var arity = arguments.length;
      var context, type, options;

      if (arity === 3) {
        // context and options are optional, so this is
        // app, selector, type
        context = null;
        type = contextOrType;
        options = {};
      } else if (arity === 4) {
        // context and options are optional, so this is
        if (typeof typeOrOptions === "object") {  // either
          // app, selector, type, options
          context = null;
          type = contextOrType;
          options = typeOrOptions;
        } else { // or
          // app, selector, context, type
          context = contextOrType;
          type = typeOrOptions;
          options = {};
        }
      } else {
        context = contextOrType;
        type = typeOrOptions;
        options = possibleOptions;
      }

      var $el = app.testHelpers.findWithAssert(selector, context);

      var event = jQuery.Event(type, options);

      run($el, 'trigger', event);

      return app.testHelpers.wait();
    }

    function keyEvent(app, selector, contextOrType, typeOrKeyCode, keyCode) {
      var context, type;

      if (typeof keyCode === 'undefined') {
        context = null;
        keyCode = typeOrKeyCode;
        type = contextOrType;
      } else {
        context = contextOrType;
        type = typeOrKeyCode;
      }

      return app.testHelpers.triggerEvent(selector, context, type, { keyCode: keyCode, which: keyCode });
    }

    function fillIn(app, selector, contextOrText, text) {
      var $el, context;
      if (typeof text === 'undefined') {
        text = contextOrText;
      } else {
        context = contextOrText;
      }
      $el = app.testHelpers.findWithAssert(selector, context);
      run(function() {
        $el.val(text).change();
      });
      return app.testHelpers.wait();
    }

    function findWithAssert(app, selector, context) {
      var $el = app.testHelpers.find(selector, context);
      if ($el.length === 0) {
        throw new EmberError("Element " + selector + " not found.");
      }
      return $el;
    }

    function find(app, selector, context) {
      var $el;
      context = context || get(app, 'rootElement');
      $el = app.$(selector, context);

      return $el;
    }

    function andThen(app, callback) {
      return app.testHelpers.wait(callback(app));
    }

    function wait(app, value) {
      return Test.promise(function(resolve) {
        // If this is the first async promise, kick off the async test
        if (++countAsync === 1) {
          Test.adapter.asyncStart();
        }

        // Every 10ms, poll for the async thing to have finished
        var watcher = setInterval(function() {
          // 1. If the router is loading, keep polling
          var routerIsLoading = !!app.__container__.lookup('router:main').router.activeTransition;
          if (routerIsLoading) { return; }

          // 2. If there are pending Ajax requests, keep polling
          if (Test.pendingAjaxRequests) { return; }

          // 3. If there are scheduled timers or we are inside of a run loop, keep polling
          if (run.hasScheduledTimers() || run.currentRunLoop) { return; }
          if (Test.waiters && Test.waiters.any(function(waiter) {
            var context = waiter[0];
            var callback = waiter[1];
            return !callback.call(context);
          })) { return; }
          // Stop polling
          clearInterval(watcher);

          // If this is the last async promise, end the async test
          if (--countAsync === 0) {
            Test.adapter.asyncEnd();
          }

          // Synchronously resolve the promise
          run(null, resolve, value);
        }, 10);
      });

    }


    /**
    * Loads a route, sets up any controllers, and renders any templates associated
    * with the route as though a real user had triggered the route change while
    * using your app.
    *
    * Example:
    *
    * ```javascript
    * visit('posts/index').then(function() {
    *   // assert something
    * });
    * ```
    *
    * @method visit
    * @param {String} url the name of the route
    * @return {RSVP.Promise}
    */
    asyncHelper('visit', visit);

    /**
    * Clicks an element and triggers any actions triggered by the element's `click`
    * event.
    *
    * Example:
    *
    * ```javascript
    * click('.some-jQuery-selector').then(function() {
    *   // assert something
    * });
    * ```
    *
    * @method click
    * @param {String} selector jQuery selector for finding element on the DOM
    * @return {RSVP.Promise}
    */
    asyncHelper('click', click);

    /**
    * Simulates a key event, e.g. `keypress`, `keydown`, `keyup` with the desired keyCode
    *
    * Example:
    *
    * ```javascript
    * keyEvent('.some-jQuery-selector', 'keypress', 13).then(function() {
    *  // assert something
    * });
    * ```
    *
    * @method keyEvent
    * @param {String} selector jQuery selector for finding element on the DOM
    * @param {String} type the type of key event, e.g. `keypress`, `keydown`, `keyup`
    * @param {Number} keyCode the keyCode of the simulated key event
    * @return {RSVP.Promise}
    * @since 1.5.0
    */
    asyncHelper('keyEvent', keyEvent);

    /**
    * Fills in an input element with some text.
    *
    * Example:
    *
    * ```javascript
    * fillIn('#email', 'you@example.com').then(function() {
    *   // assert something
    * });
    * ```
    *
    * @method fillIn
    * @param {String} selector jQuery selector finding an input element on the DOM
    * to fill text with
    * @param {String} text text to place inside the input element
    * @return {RSVP.Promise}
    */
    asyncHelper('fillIn', fillIn);

    /**
    * Finds an element in the context of the app's container element. A simple alias
    * for `app.$(selector)`.
    *
    * Example:
    *
    * ```javascript
    * var $el = find('.my-selector');
    * ```
    *
    * @method find
    * @param {String} selector jQuery string selector for element lookup
    * @return {Object} jQuery object representing the results of the query
    */
    helper('find', find);

    /**
    * Like `find`, but throws an error if the element selector returns no results.
    *
    * Example:
    *
    * ```javascript
    * var $el = findWithAssert('.doesnt-exist'); // throws error
    * ```
    *
    * @method findWithAssert
    * @param {String} selector jQuery selector string for finding an element within
    * the DOM
    * @return {Object} jQuery object representing the results of the query
    * @throws {Error} throws error if jQuery object returned has a length of 0
    */
    helper('findWithAssert', findWithAssert);

    /**
      Causes the run loop to process any pending events. This is used to ensure that
      any async operations from other helpers (or your assertions) have been processed.

      This is most often used as the return value for the helper functions (see 'click',
      'fillIn','visit',etc).

      Example:

      ```javascript
      Ember.Test.registerAsyncHelper('loginUser', function(app, username, password) {
        visit('secured/path/here')
        .fillIn('#username', username)
        .fillIn('#password', password)
        .click('.submit')

        return app.testHelpers.wait();
      });

      @method wait
      @param {Object} value The value to be returned.
      @return {RSVP.Promise}
    */
    asyncHelper('wait', wait);
    asyncHelper('andThen', andThen);


    /**
      Returns the currently active route name.

    Example:

    ```javascript
    function validateRouteName(){
    equal(currentRouteName(), 'some.path', "correct route was transitioned into.");
    }

    visit('/some/path').then(validateRouteName)
    ```

    @method currentRouteName
    @return {Object} The name of the currently active route.
    @since 1.5.0
    */
    helper('currentRouteName', currentRouteName);

    /**
      Returns the current path.

    Example:

    ```javascript
    function validateURL(){
    equal(currentPath(), 'some.path.index', "correct path was transitioned into.");
    }

    click('#some-link-id').then(validateURL);
    ```

    @method currentPath
    @return {Object} The currently active path.
    @since 1.5.0
    */
    helper('currentPath', currentPath);

    /**
      Returns the current URL.

    Example:

    ```javascript
    function validateURL(){
    equal(currentURL(), '/some/path', "correct URL was transitioned into.");
    }

    click('#some-link-id').then(validateURL);
    ```

    @method currentURL
    @return {Object} The currently active URL.
    @since 1.5.0
    */
    helper('currentURL', currentURL);

    
      /**
       Pauses the current test - this is useful for debugging while testing or for test-driving.
       It allows you to inspect the state of your application at any point.

       Example (The test will pause before clicking the button):

       ```javascript
       visit('/')
       return pauseTest();

       click('.btn');
       ```

       @method pauseTest
       @return {Object} A promise that will never resolve
       */
      helper('pauseTest', pauseTest);
    

    /**
      Triggers the given DOM event on the element identified by the provided selector.

      Example:

      ```javascript
      triggerEvent('#some-elem-id', 'blur');
      ```

      This is actually used internally by the `keyEvent` helper like so:

      ```javascript
      triggerEvent('#some-elem-id', 'keypress', { keyCode: 13 });
      ```

     @method triggerEvent
     @param {String} selector jQuery selector for finding element on the DOM
     @param {String} [context] jQuery selector that will limit the selector
                               argument to find only within the context's children
     @param {String} type The event type to be triggered.
     @param {Object} [options] The options to be passed to jQuery.Event.
     @return {RSVP.Promise}
     @since 1.5.0
    */
    asyncHelper('triggerEvent', triggerEvent);
  });
enifed("ember-testing/initializers",
  ["ember-runtime/system/lazy_load"],
  function(__dependency1__) {
    "use strict";
    var onLoad = __dependency1__.onLoad;

    var name = 'deferReadiness in `testing` mode';

    onLoad('Ember.Application', function(Application) {
      if (!Application.initializers[name]) {
        Application.initializer({
          name: name,

          initialize: function(container, application){
            if (application.testing) {
              application.deferReadiness();
            }
          }
        });
      }
    });
  });
enifed("ember-testing/setup_for_testing",
  ["ember-metal/core","ember-testing/adapters/qunit","ember-views/system/jquery","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    // import Test from "ember-testing/test";  // ES6TODO: fix when cycles are supported
    var QUnitAdapter = __dependency2__["default"];
    var jQuery = __dependency3__["default"];

    var Test, requests;

    function incrementAjaxPendingRequests(_, xhr){
      requests.push(xhr);
      Test.pendingAjaxRequests = requests.length;
    }

    function decrementAjaxPendingRequests(_, xhr){
      for (var i=0;i<requests.length;i++) {
        if (xhr === requests[i]) {
          requests.splice(i, 1);
        }
      }
      Test.pendingAjaxRequests = requests.length;
    }

    /**
      Sets Ember up for testing. This is useful to perform
      basic setup steps in order to unit test.

      Use `App.setupForTesting` to perform integration tests (full
      application testing).

      @method setupForTesting
      @namespace Ember
      @since 1.5.0
    */
    __exports__["default"] = function setupForTesting() {
      if (!Test) { Test = requireModule('ember-testing/test')['default']; }

      Ember.testing = true;

      // if adapter is not manually set default to QUnit
      if (!Test.adapter) {
        Test.adapter = QUnitAdapter.create();
      }

      requests = [];
      Test.pendingAjaxRequests = requests.length;

      jQuery(document).off('ajaxSend', incrementAjaxPendingRequests);
      jQuery(document).off('ajaxComplete', decrementAjaxPendingRequests);
      jQuery(document).on('ajaxSend', incrementAjaxPendingRequests);
      jQuery(document).on('ajaxComplete', decrementAjaxPendingRequests);
    }
  });
enifed("ember-testing/support",
  ["ember-metal/core","ember-views/system/jquery"],
  function(__dependency1__, __dependency2__) {
    "use strict";
    var Ember = __dependency1__["default"];
    var jQuery = __dependency2__["default"];

    /**
      @module ember
      @submodule ember-testing
     */

    var $ = jQuery;

    /**
      This method creates a checkbox and triggers the click event to fire the
      passed in handler. It is used to correct for a bug in older versions
      of jQuery (e.g 1.8.3).

      @private
      @method testCheckboxClick
    */
    function testCheckboxClick(handler) {
      $('<input type="checkbox">')
        .css({ position: 'absolute', left: '-1000px', top: '-1000px' })
        .appendTo('body')
        .on('click', handler)
        .trigger('click')
        .remove();
    }

    $(function() {
      /*
        Determine whether a checkbox checked using jQuery's "click" method will have
        the correct value for its checked property.

        If we determine that the current jQuery version exhibits this behavior,
        patch it to work correctly as in the commit for the actual fix:
        https://github.com/jquery/jquery/commit/1fb2f92.
      */
      testCheckboxClick(function() {
        if (!this.checked && !$.event.special.click) {
          $.event.special.click = {
            // For checkbox, fire native event so checked state will be right
            trigger: function() {
              if ($.nodeName( this, "input" ) && this.type === "checkbox" && this.click) {
                this.click();
                return false;
              }
            }
          };
        }
      });

      // Try again to verify that the patch took effect or blow up.
      testCheckboxClick(function() {
        Ember.warn("clicked checkboxes should be checked! the jQuery patch didn't work", this.checked);
      });
    });
  });
enifed("ember-testing/test",
  ["ember-metal/core","ember-metal/run_loop","ember-metal/platform","ember-runtime/compare","ember-runtime/ext/rsvp","ember-testing/setup_for_testing","ember-application/system/application","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    var emberRun = __dependency2__["default"];
    var create = __dependency3__.create;
    var compare = __dependency4__["default"];
    var RSVP = __dependency5__["default"];
    var setupForTesting = __dependency6__["default"];
    var EmberApplication = __dependency7__["default"];

    /**
      @module ember
      @submodule ember-testing
     */
    var slice = [].slice;
    var helpers = {};
    var injectHelpersCallbacks = [];

    /**
      This is a container for an assortment of testing related functionality:

      * Choose your default test adapter (for your framework of choice).
      * Register/Unregister additional test helpers.
      * Setup callbacks to be fired when the test helpers are injected into
        your application.

      @class Test
      @namespace Ember
    */
    var Test = {
      /**
        Hash containing all known test helpers.

        @property _helpers
        @private
        @since 1.7.0
      */
      _helpers: helpers,

      /**
        `registerHelper` is used to register a test helper that will be injected
        when `App.injectTestHelpers` is called.

        The helper method will always be called with the current Application as
        the first parameter.

        For example:

        ```javascript
        Ember.Test.registerHelper('boot', function(app) {
          Ember.run(app, app.advanceReadiness);
        });
        ```

        This helper can later be called without arguments because it will be
        called with `app` as the first parameter.

        ```javascript
        App = Ember.Application.create();
        App.injectTestHelpers();
        boot();
        ```

        @public
        @method registerHelper
        @param {String} name The name of the helper method to add.
        @param {Function} helperMethod
        @param options {Object}
      */
      registerHelper: function(name, helperMethod) {
        helpers[name] = {
          method: helperMethod,
          meta: { wait: false }
        };
      },

      /**
        `registerAsyncHelper` is used to register an async test helper that will be injected
        when `App.injectTestHelpers` is called.

        The helper method will always be called with the current Application as
        the first parameter.

        For example:

        ```javascript
        Ember.Test.registerAsyncHelper('boot', function(app) {
          Ember.run(app, app.advanceReadiness);
        });
        ```

        The advantage of an async helper is that it will not run
        until the last async helper has completed.  All async helpers
        after it will wait for it complete before running.


        For example:

        ```javascript
        Ember.Test.registerAsyncHelper('deletePost', function(app, postId) {
          click('.delete-' + postId);
        });

        // ... in your test
        visit('/post/2');
        deletePost(2);
        visit('/post/3');
        deletePost(3);
        ```

        @public
        @method registerAsyncHelper
        @param {String} name The name of the helper method to add.
        @param {Function} helperMethod
        @since 1.2.0
      */
      registerAsyncHelper: function(name, helperMethod) {
        helpers[name] = {
          method: helperMethod,
          meta: { wait: true }
        };
      },

      /**
        Remove a previously added helper method.

        Example:

        ```javascript
        Ember.Test.unregisterHelper('wait');
        ```

        @public
        @method unregisterHelper
        @param {String} name The helper to remove.
      */
      unregisterHelper: function(name) {
        delete helpers[name];
        delete Test.Promise.prototype[name];
      },

      /**
        Used to register callbacks to be fired whenever `App.injectTestHelpers`
        is called.

        The callback will receive the current application as an argument.

        Example:

        ```javascript
        Ember.Test.onInjectHelpers(function() {
          Ember.$(document).ajaxSend(function() {
            Test.pendingAjaxRequests++;
          });

          Ember.$(document).ajaxComplete(function() {
            Test.pendingAjaxRequests--;
          });
        });
        ```

        @public
        @method onInjectHelpers
        @param {Function} callback The function to be called.
      */
      onInjectHelpers: function(callback) {
        injectHelpersCallbacks.push(callback);
      },

      /**
        This returns a thenable tailored for testing.  It catches failed
        `onSuccess` callbacks and invokes the `Ember.Test.adapter.exception`
        callback in the last chained then.

        This method should be returned by async helpers such as `wait`.

        @public
        @method promise
        @param {Function} resolver The function used to resolve the promise.
      */
      promise: function(resolver) {
        return new Test.Promise(resolver);
      },

      /**
       Used to allow ember-testing to communicate with a specific testing
       framework.

       You can manually set it before calling `App.setupForTesting()`.

       Example:

       ```javascript
       Ember.Test.adapter = MyCustomAdapter.create()
       ```

       If you do not set it, ember-testing will default to `Ember.Test.QUnitAdapter`.

       @public
       @property adapter
       @type {Class} The adapter to be used.
       @default Ember.Test.QUnitAdapter
      */
      adapter: null,

      /**
        Replacement for `Ember.RSVP.resolve`
        The only difference is this uses
        an instance of `Ember.Test.Promise`

        @public
        @method resolve
        @param {Mixed} The value to resolve
        @since 1.2.0
      */
      resolve: function(val) {
        return Test.promise(function(resolve) {
          return resolve(val);
        });
      },

      /**
         This allows ember-testing to play nicely with other asynchronous
         events, such as an application that is waiting for a CSS3
         transition or an IndexDB transaction.

         For example:

         ```javascript
         Ember.Test.registerWaiter(function() {
           return myPendingTransactions() == 0;
         });
         ```
         The `context` argument allows you to optionally specify the `this`
         with which your callback will be invoked.

         For example:

         ```javascript
         Ember.Test.registerWaiter(MyDB, MyDB.hasPendingTransactions);
         ```

         @public
         @method registerWaiter
         @param {Object} context (optional)
         @param {Function} callback
         @since 1.2.0
      */
      registerWaiter: function(context, callback) {
        if (arguments.length === 1) {
          callback = context;
          context = null;
        }
        if (!this.waiters) {
          this.waiters = Ember.A();
        }
        this.waiters.push([context, callback]);
      },
      /**
         `unregisterWaiter` is used to unregister a callback that was
         registered with `registerWaiter`.

         @public
         @method unregisterWaiter
         @param {Object} context (optional)
         @param {Function} callback
         @since 1.2.0
      */
      unregisterWaiter: function(context, callback) {
        var pair;
        if (!this.waiters) { return; }
        if (arguments.length === 1) {
          callback = context;
          context = null;
        }
        pair = [context, callback];
        this.waiters = Ember.A(this.waiters.filter(function(elt) {
          return compare(elt, pair)!==0;
        }));
      }
    };

    function helper(app, name) {
      var fn = helpers[name].method;
      var meta = helpers[name].meta;

      return function() {
        var args = slice.call(arguments);
        var lastPromise = Test.lastPromise;

        args.unshift(app);

        // some helpers are not async and
        // need to return a value immediately.
        // example: `find`
        if (!meta.wait) {
          return fn.apply(app, args);
        }

        if (!lastPromise) {
          // It's the first async helper in current context
          lastPromise = fn.apply(app, args);
        } else {
          // wait for last helper's promise to resolve
          // and then execute
          run(function() {
            lastPromise = Test.resolve(lastPromise).then(function() {
              return fn.apply(app, args);
            });
          });
        }

        return lastPromise;
      };
    }

    function run(fn) {
      if (!emberRun.currentRunLoop) {
        emberRun(fn);
      } else {
        fn();
      }
    }

    EmberApplication.reopen({
      /**
       This property contains the testing helpers for the current application. These
       are created once you call `injectTestHelpers` on your `Ember.Application`
       instance. The included helpers are also available on the `window` object by
       default, but can be used from this object on the individual application also.

        @property testHelpers
        @type {Object}
        @default {}
      */
      testHelpers: {},

      /**
       This property will contain the original methods that were registered
       on the `helperContainer` before `injectTestHelpers` is called.

       When `removeTestHelpers` is called, these methods are restored to the
       `helperContainer`.

        @property originalMethods
        @type {Object}
        @default {}
        @private
        @since 1.3.0
      */
      originalMethods: {},


      /**
      This property indicates whether or not this application is currently in
      testing mode. This is set when `setupForTesting` is called on the current
      application.

      @property testing
      @type {Boolean}
      @default false
      @since 1.3.0
      */
      testing: false,

      /**
       This hook defers the readiness of the application, so that you can start
       the app when your tests are ready to run. It also sets the router's
       location to 'none', so that the window's location will not be modified
       (preventing both accidental leaking of state between tests and interference
       with your testing framework).

       Example:

      ```
      App.setupForTesting();
      ```

        @method setupForTesting
      */
      setupForTesting: function() {
        setupForTesting();

        this.testing = true;

        this.Router.reopen({
          location: 'none'
        });
      },

      /**
        This will be used as the container to inject the test helpers into. By
        default the helpers are injected into `window`.

        @property helperContainer
        @type {Object} The object to be used for test helpers.
        @default window
        @since 1.2.0
      */
      helperContainer: window,

      /**
        This injects the test helpers into the `helperContainer` object. If an object is provided
        it will be used as the helperContainer. If `helperContainer` is not set it will default
        to `window`. If a function of the same name has already been defined it will be cached
        (so that it can be reset if the helper is removed with `unregisterHelper` or
        `removeTestHelpers`).

       Any callbacks registered with `onInjectHelpers` will be called once the
       helpers have been injected.

      Example:
      ```
      App.injectTestHelpers();
      ```

        @method injectTestHelpers
      */
      injectTestHelpers: function(helperContainer) {
        if (helperContainer) { this.helperContainer = helperContainer; }

        this.testHelpers = {};
        for (var name in helpers) {
          this.originalMethods[name] = this.helperContainer[name];
          this.testHelpers[name] = this.helperContainer[name] = helper(this, name);
          protoWrap(Test.Promise.prototype, name, helper(this, name), helpers[name].meta.wait);
        }

        for(var i = 0, l = injectHelpersCallbacks.length; i < l; i++) {
          injectHelpersCallbacks[i](this);
        }
      },

      /**
        This removes all helpers that have been registered, and resets and functions
        that were overridden by the helpers.

        Example:

        ```javascript
        App.removeTestHelpers();
        ```

        @public
        @method removeTestHelpers
      */
      removeTestHelpers: function() {
        for (var name in helpers) {
          this.helperContainer[name] = this.originalMethods[name];
          delete this.testHelpers[name];
          delete this.originalMethods[name];
        }
      }
    });

    // This method is no longer needed
    // But still here for backwards compatibility
    // of helper chaining
    function protoWrap(proto, name, callback, isAsync) {
      proto[name] = function() {
        var args = arguments;
        if (isAsync) {
          return callback.apply(this, args);
        } else {
          return this.then(function() {
            return callback.apply(this, args);
          });
        }
      };
    }

    Test.Promise = function() {
      RSVP.Promise.apply(this, arguments);
      Test.lastPromise = this;
    };

    Test.Promise.prototype = create(RSVP.Promise.prototype);
    Test.Promise.prototype.constructor = Test.Promise;

    // Patch `then` to isolate async methods
    // specifically `Ember.Test.lastPromise`
    var originalThen = RSVP.Promise.prototype.then;
    Test.Promise.prototype.then = function(onSuccess, onFailure) {
      return originalThen.call(this, function(val) {
        return isolate(onSuccess, val);
      }, onFailure);
    };

    // This method isolates nested async methods
    // so that they don't conflict with other last promises.
    //
    // 1. Set `Ember.Test.lastPromise` to null
    // 2. Invoke method
    // 3. Return the last promise created during method
    // 4. Restore `Ember.Test.lastPromise` to original value
    function isolate(fn, val) {
      var value, lastPromise;

      // Reset lastPromise for nested helpers
      Test.lastPromise = null;

      value = fn(val);

      lastPromise = Test.lastPromise;

      // If the method returned a promise
      // return that promise. If not,
      // return the last async helper's promise
      if ((value && (value instanceof Test.Promise)) || !lastPromise) {
        return value;
      } else {
        run(function() {
          lastPromise = Test.resolve(lastPromise).then(function() {
            return value;
          });
        });
        return lastPromise;
      }
    }

    __exports__["default"] = Test;
  });
requireModule("ember-testing");

})();