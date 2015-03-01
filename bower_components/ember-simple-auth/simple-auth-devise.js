(function(global) {

Ember.libraries.register('Ember Simple Auth Devise', '0.7.2');

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

define("simple-auth-devise/authenticators/devise", 
  ["simple-auth/authenticators/base","./../configuration","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Base = __dependency1__["default"];
    var Configuration = __dependency2__["default"];

    /**
      Authenticator that works with the Ruby gem
      [Devise](https://github.com/plataformatec/devise).

      __As token authentication is not actually part of devise anymore, the server
      needs to implement some customizations__ to work with this authenticator -
      see the README and
      [discussion here](https://gist.github.com/josevalim/fb706b1e933ef01e4fb6).

      _The factory for this authenticator is registered as
      `'simple-auth-authenticator:devise'` in Ember's container._

      @class Devise
      @namespace SimpleAuth.Authenticators
      @module simple-auth-devise/authenticators/devise
      @extends Base
    */
    __exports__["default"] = Base.extend({
      /**
        The endpoint on the server the authenticator acquires the auth token
        and email from.

        This value can be configured via
        [`SimpleAuth.Configuration.Devise#serverTokenEndpoint`](#SimpleAuth-Configuration-Devise-serverTokenEndpoint).

        @property serverTokenEndpoint
        @type String
        @default '/users/sign_in'
      */
      serverTokenEndpoint: '/users/sign_in',

      /**
        The devise resource name

        This value can be configured via
        [`SimpleAuth.Configuration.Devise#resourceName`](#SimpleAuth-Configuration-Devise-resourceName).

        @property resourceName
        @type String
        @default 'user'
      */
      resourceName: 'user',

      /**
        The token attribute name.

        This value can be configured via
        [`SimpleAuth.Configuration.Devise#tokenAttributeName`](#SimpleAuth-Configuration-Devise-tokenAttributeName).

        @property tokenAttributeName
        @type String
        @default 'user_token'
      */
      tokenAttributeName: 'user_token',

      /**
        The identification attribute name.

        This value can be configured via
        [`SimpleAuth.Configuration.Devise#identificationAttributeName`](#SimpleAuth-Configuration-Devise-identificationAttributeName).

        @property identificationAttributeName
        @type String
        @default 'user_email'
      */
      identificationAttributeName: 'user_email',

      /**
        @method init
        @private
      */
      init: function() {
        this.serverTokenEndpoint          = Configuration.serverTokenEndpoint;
        this.resourceName                 = Configuration.resourceName;
        this.tokenAttributeName           = Configuration.tokenAttributeName;
        this.identificationAttributeName  = Configuration.identificationAttributeName;
      },

      /**
        Restores the session from a set of session properties; __will return a
        resolving promise when there's a non-empty `user_token` and a non-empty
        `user_email` in the `properties`__ and a rejecting promise otherwise.

        @method restore
        @param {Object} properties The properties to restore the session from
        @return {Ember.RSVP.Promise} A promise that when it resolves results in the session being authenticated
      */
      restore: function(properties) {
        var _this            = this;
        var propertiesObject = Ember.Object.create(properties);
        return new Ember.RSVP.Promise(function(resolve, reject) {
          if (!Ember.isEmpty(propertiesObject.get(_this.tokenAttributeName)) && !Ember.isEmpty(propertiesObject.get(_this.identificationAttributeName))) {
            resolve(properties);
          } else {
            reject();
          }
        });
      },

      /**
        Authenticates the session with the specified `credentials`; the credentials
        are `POST`ed to the
        [`Authenticators.Devise#serverTokenEndpoint`](#SimpleAuth-Authenticators-Devise-serverTokenEndpoint)
        and if they are valid the server returns an auth token and email in
        response. __If the credentials are valid and authentication succeeds, a
        promise that resolves with the server's response is returned__, otherwise a
        promise that rejects with the server error is returned.

        @method authenticate
        @param {Object} options The credentials to authenticate the session with
        @return {Ember.RSVP.Promise} A promise that resolves when an auth token and email is successfully acquired from the server and rejects otherwise
      */
      authenticate: function(credentials) {
        var _this = this;
        return new Ember.RSVP.Promise(function(resolve, reject) {
          var data                 = {};
          data[_this.resourceName] = {
            email:    credentials.identification,
            password: credentials.password
          };
          _this.makeRequest(data).then(function(response) {
            Ember.run(function() {
              resolve(response);
            });
          }, function(xhr, status, error) {
            Ember.run(function() {
              reject(xhr.responseJSON || xhr.responseText);
            });
          });
        });
      },

      /**
        Does nothing

        @method invalidate
        @return {Ember.RSVP.Promise} A resolving promise
      */
      invalidate: function() {
        return Ember.RSVP.resolve();
      },

      /**
        @method makeRequest
        @private
      */
      makeRequest: function(data, resolve, reject) {
        return Ember.$.ajax({
          url:        this.serverTokenEndpoint,
          type:       'POST',
          data:       data,
          dataType:   'json',
          beforeSend: function(xhr, settings) {
            xhr.setRequestHeader('Accept', settings.accepts.json);
          }
        });
      }
    });
  });
define("simple-auth-devise/authorizers/devise", 
  ["simple-auth/authorizers/base","./../configuration","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Base = __dependency1__["default"];
    var Configuration = __dependency2__["default"];

    /**
      Authenticator that works with the Ruby gem
      [Devise](https://github.com/plataformatec/devise) by sending the `user_token`
      and `user_email` properties from the session in the `Authorization` header.

      __As token authentication is not actually part of devise anymore, the server
      needs to implement some customizations__ to work with this authenticator -
      see the README for more information.

      _The factory for this authorizer is registered as
      `'simple-auth-authorizer:devise'` in Ember's container._

      @class Devise
      @namespace SimpleAuth.Authorizers
      @module simple-auth-devise/authorizers/devise
      @extends Base
    */
    __exports__["default"] = Base.extend({
      /**
        The token attribute name.

        This value can be configured via
        [`SimpleAuth.Configuration.Devise#tokenAttributeName`](#SimpleAuth-Configuration-Devise-tokenAttributeName).

        @property tokenAttributeName
        @type String
        @default 'user_token'
      */
      tokenAttributeName: 'user_token',

      /**
        The identification attribute name.

        This value can be configured via
        [`SimpleAuth.Configuration.Devise#identificationAttributeName`](#SimpleAuth-Configuration-Devise-identificationAttributeName).

        @property identificationAttributeName
        @type String
        @default 'user_email'
      */
      identificationAttributeName: 'user_email',

      /**
        Authorizes an XHR request by sending the `user_token` and `user_email`
        properties from the session in the `Authorization` header:

        ```
        Authorization: Token <tokenAttributeName>="<token>", <identificationAttributeName>="<user identification>"
        ```

        @method authorize
        @param {jqXHR} jqXHR The XHR request to authorize (see http://api.jquery.com/jQuery.ajax/#jqXHR)
        @param {Object} requestOptions The options as provided to the `$.ajax` method (see http://api.jquery.com/jQuery.ajaxPrefilter/)
      */

      /**
        @method init
        @private
      */
      init: function() {
        this.tokenAttributeName          = Configuration.tokenAttributeName;
        this.identificationAttributeName = Configuration.identificationAttributeName;
      },

      authorize: function(jqXHR, requestOptions) {
        var userToken          = this.get('session').get(this.tokenAttributeName);
        var userIdentification = this.get('session').get(this.identificationAttributeName);
        if (this.get('session.isAuthenticated') && !Ember.isEmpty(userToken) && !Ember.isEmpty(userIdentification)) {
          var authData = this.tokenAttributeName + '="' + userToken + '", ' + this.identificationAttributeName + '="' + userIdentification + '"';
          jqXHR.setRequestHeader('Authorization', 'Token ' + authData);
        }
      }
    });
  });
define("simple-auth-devise/configuration", 
  ["simple-auth/utils/load-config","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var loadConfig = __dependency1__["default"];

    var defaults = {
      serverTokenEndpoint:         '/users/sign_in',
      resourceName:                'user',
      tokenAttributeName:          'user_token',
      identificationAttributeName: 'user_email'
    };

    /**
      Ember Simple Auth Device's configuration object.

      To change any of these values, set them on the application's environment
      object:

      ```js
      ENV['simple-auth-devise'] = {
        serverTokenEndpoint: '/some/other/endpoint'
      }
      ```

      @class Devise
      @namespace SimpleAuth.Configuration
      @module simple-auth/configuration
    */
    __exports__["default"] = {
      /**
        The endpoint on the server the authenticator acquires the auth token
        and email from.

        @property serverTokenEndpoint
        @readOnly
        @static
        @type String
        @default '/users/sign_in'
      */
      serverTokenEndpoint: defaults.serverTokenEndpoint,

      /**
        The devise resource name.

        @property resourceName
        @readOnly
        @static
        @type String
        @default 'user'
      */
      resourceName: defaults.resourceName,

      /**
        The token attribute name.

        @property tokenAttributeName
        @readOnly
        @static
        @type String
        @default 'user_token'
      */
      tokenAttributeName: defaults.tokenAttributeName,

      /**
        The email attribute name.

        @property identificationAttributeName
        @readOnly
        @static
        @type String
        @default 'user_email'
      */
      identificationAttributeName: defaults.identificationAttributeName,

      /**
        @method load
        @private
      */
      load: loadConfig(defaults)
    };
  });
define("simple-auth-devise/ember", 
  ["./initializer"],
  function(__dependency1__) {
    "use strict";
    var initializer = __dependency1__["default"];

    Ember.onLoad('Ember.Application', function(Application) {
      Application.initializer(initializer);
    });
  });
define("simple-auth-devise/initializer", 
  ["./configuration","simple-auth/utils/get-global-config","simple-auth-devise/authenticators/devise","simple-auth-devise/authorizers/devise","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var Configuration = __dependency1__["default"];
    var getGlobalConfig = __dependency2__["default"];
    var Authenticator = __dependency3__["default"];
    var Authorizer = __dependency4__["default"];

    __exports__["default"] = {
      name:       'simple-auth-devise',
      before:     'simple-auth',
      initialize: function(container, application) {
        var config = getGlobalConfig('simple-auth-devise');
        Configuration.load(container, config);
        container.register('simple-auth-authorizer:devise', Authorizer);
        container.register('simple-auth-authenticator:devise', Authenticator);
      }
    };
  });
define('simple-auth/authenticators/base',  ['exports'], function(__exports__) {
  __exports__['default'] = global.SimpleAuth.Authenticators.Base;
});
define('simple-auth/authorizers/base',  ['exports'], function(__exports__) {
  __exports__['default'] = global.SimpleAuth.Authorizers.Base;
});
define('simple-auth/utils/get-global-config',  ['exports'], function(__exports__) {
  __exports__['default'] = global.SimpleAuth.Utils.getGlobalConfig;
});
define('simple-auth/utils/load-config',  ['exports'], function(__exports__) {
  __exports__['default'] = global.SimpleAuth.Utils.loadConfig;
});

var initializer   = requireModule('simple-auth-devise/initializer')['default'];
var Configuration = requireModule('simple-auth-devise/configuration')['default'];
var Authenticator = requireModule('simple-auth-devise/authenticators/devise')['default'];
var Authorizer    = requireModule('simple-auth-devise/authorizers/devise')['default'];

global.SimpleAuth.Configuration.Devise  = Configuration;
global.SimpleAuth.Authenticators.Devise = Authenticator;
global.SimpleAuth.Authorizers.Devise    = Authorizer;

requireModule('simple-auth-devise/ember');
})((typeof global !== 'undefined') ? global : window);
