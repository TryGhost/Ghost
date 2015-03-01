(function(global) {
  var define = global.define;
  var require = global.require;
  var Ember = global.Ember;
  if (typeof Ember === 'undefined' && typeof require !== 'undefined') {
    Ember = require('ember');
  }

Ember.libraries.register('Ember Simple Auth Testing', '0.7.2');

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
})(this);
