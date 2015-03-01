(function(global) {

Ember.libraries.register('Ember Simple Auth Testing', '0.7.2');

var define, requireModule;

(function() {
  var registry = {}, seen = {};

  define = function(name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  requireModule = function(name) {
    if (seen.hasOwnProperty(name)) { return seen[name]; }
    seen[name] = {};

    if (!registry[name]) {
      throw new Error("Could not find module " + name);
    }

    var mod = registry[name],
        deps = mod.deps,
        callback = mod.callback,
        reified = [],
        exports;

    for (var i=0, l=deps.length; i<l; i++) {
      if (deps[i] === 'exports') {
        reified.push(exports = {});
      } else {
        reified.push(requireModule(resolve(deps[i])));
      }
    }

    var value = callback.apply(this, reified);
    return seen[name] = exports || value;

    function resolve(child) {
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
  };

  requireModule.registry = registry;
})();

define("simple-auth-testing/authenticators/test", 
  ["simple-auth/authenticators/base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Base = __dependency1__["default"];

    __exports__["default"] = Base.extend({
      restore: function(data) {
        return new Ember.RSVP.resolve();
      },

      authenticate: function(options) {
        return new Ember.RSVP.resolve();
      },

      invalidate: function(data) {
        return new Ember.RSVP.resolve();
      }
    });
  });
define("simple-auth-testing/ember", 
  ["./initializer"],
  function(__dependency1__) {
    "use strict";
    var initializer = __dependency1__["default"];

    Ember.onLoad('Ember.Application', function(Application) {
      Application.initializer(initializer);
    });
  });
define("simple-auth-testing/initializer", 
  ["simple-auth-testing/authenticators/test","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var TestAuthenticator = __dependency1__["default"];

    __exports__["default"] = {
      name:       'simple-auth-testing',
      before:     'simple-auth',
      initialize: function(container, application) {
        container.register('simple-auth-authenticator:test', TestAuthenticator);
      }
    };
  });
define("simple-auth-testing/test-helpers", 
  ["simple-auth/configuration","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Configuration = __dependency1__["default"];

    var testHelpers = function() {
      Ember.Test.registerAsyncHelper('authenticateSession', function(app) {
        var session = app.__container__.lookup(Configuration.session);
        session.authenticate('simple-auth-authenticator:test');
        return wait();
      });

      Ember.Test.registerHelper('currentSession', function(app) {
        var session = app.__container__.lookup(Configuration.session);
        return session;
      });

      Ember.Test.registerAsyncHelper('invalidateSession', function(app) {
        var session = app.__container__.lookup(Configuration.session);
        if (session.get('isAuthenticated')) {
          session.invalidate();
        }
        return wait();
      });
    }();

    __exports__["default"] = testHelpers;
  });
define('simple-auth/authenticators/base',  ['exports'], function(__exports__) {
  __exports__['default'] = global.SimpleAuth.Authenticators.Base;
});
define('simple-auth/configuration',  ['exports'], function(__exports__) {
  __exports__['default'] = global.SimpleAuth.Configuration;
});

requireModule('simple-auth-testing/ember');
requireModule('simple-auth-testing/test-helpers');
})((typeof global !== 'undefined') ? global : window);
