(function(global) {
  var define = global.define;
  var require = global.require;
  var Ember = global.Ember;
  if (typeof Ember === 'undefined' && typeof require !== 'undefined') {
    Ember = require('ember');
  }

Ember.libraries.register('Ember Simple Auth Torii', '0.7.2');

define("simple-auth-torii/authenticators/torii", 
  ["simple-auth/authenticators/base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Base = __dependency1__["default"];

    /**
      Authenticator that wraps the
      [Torii library](https://github.com/Vestorly/torii).

      _The factory for this authenticator is registered as
      `'simple-auth-authenticator:torii'` in Ember's container._

      @class Torii
      @namespace SimpleAuth.Authenticators
      @module simple-auth-torii/authenticators/torii
      @extends Base
    */
    __exports__["default"] = Base.extend({
      /**
        @property torii
        @private
      */
      torii: null,

      /**
        @property provider
        @private
      */
      provider: null,

      /**
        Restores the session by calling the torii provider's `fetch` method.

        @method restore
        @param {Object} data The data to restore the session from
        @return {Ember.RSVP.Promise} A promise that when it resolves results in the session being authenticated
      */
      restore: function(data) {
        var _this = this;
        data      = data || {};
        return new Ember.RSVP.Promise(function(resolve, reject) {
          if (!Ember.isEmpty(data.provider)) {
            var provider = data.provider;
            _this.torii.fetch(data.provider, data).then(function(data) {
              _this.resolveWith(provider, data, resolve);
            }, function() {
              delete _this.provider;
              reject();
            });
          } else {
            delete _this.provider;
            reject();
          }
        });
      },

      /**
        Authenticates the session by opening the torii provider. For more
        documentation on torii, see the
        [project's README](https://github.com/Vestorly/torii#readme).

        @method authenticate
        @param {String} provider The provider to authenticate the session with
        @param {Object} options The options to pass to the torii provider
        @return {Ember.RSVP.Promise} A promise that resolves when the provider successfully authenticates a user and rejects otherwise
      */
      authenticate: function(provider, options) {
        var _this = this;
        return new Ember.RSVP.Promise(function(resolve, reject) {
          _this.torii.open(provider, options || {}).then(function(data) {
            _this.resolveWith(provider, data, resolve);
          }, reject);
        });
      },

      /**
        Closes the torii provider.

        @method invalidate
        @param {Object} data The data that's stored in the session
        @return {Ember.RSVP.Promise} A promise that resolves when the provider successfully closes and rejects otherwise
      */
      invalidate: function(data) {
        var _this = this;
        return new Ember.RSVP.Promise(function(resolve, reject) {
          _this.torii.close(_this.provider).then(function() {
            delete _this.provider;
            resolve();
          }, reject);
        });
      },

      /**
        @method resolveWith
        @private
      */
      resolveWith: function(provider, data, resolve) {
        data.provider = provider;
        this.provider = data.provider;
        resolve(data);
      }

    });
  });
define("simple-auth-torii/ember", 
  ["./initializer"],
  function(__dependency1__) {
    "use strict";
    var initializer = __dependency1__["default"];

    Ember.onLoad('Ember.Application', function(Application) {
      Application.initializer(initializer);
    });
  });
define("simple-auth-torii/initializer", 
  ["simple-auth-torii/authenticators/torii","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Authenticator = __dependency1__["default"];

    __exports__["default"] = {
      name:   'simple-auth-torii',
      before: 'simple-auth',
      after:  'torii',
      initialize: function(container, application) {
        var torii         = container.lookup('torii:main');
        var authenticator = Authenticator.create({ torii: torii });
        container.register('simple-auth-authenticator:torii', authenticator, { instantiate: false });
      }
    };
  });
})(this);
