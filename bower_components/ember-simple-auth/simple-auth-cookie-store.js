(function(global) {

Ember.libraries.register('Ember Simple Auth Cookie Store', '0.7.2');

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

define("simple-auth-cookie-store/configuration", 
  ["simple-auth/utils/load-config","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var loadConfig = __dependency1__["default"];

    var defaults = {
      cookieName:           'ember_simple_auth:session',
      cookieDomain:         null,
      cookieExpirationTime: null
    };

    /**
      Ember Simple Auth Cookie Store's configuration object.

      To change any of these values, set them on the application's environment
      object:

      ```js
      ENV['simple-auth-cookie-store'] = {
        cookieName: 'my_app_auth_session'
      }
      ```

      @class CookieStore
      @namespace SimpleAuth.Configuration
      @module simple-auth/configuration
    */
    __exports__["default"] = {

      /**
        The domain to use for the cookie, e.g., "example.com", ".example.com"
        (includes all subdomains) or "subdomain.example.com". If not configured the
        cookie domain defaults to the domain the session was authneticated on.

        This value can be configured via
        [`SimpleAuth.Configuration.CookieStore#cookieDomain`](#SimpleAuth-Configuration-CookieStore-cookieDomain).

        @property cookieDomain
        @type String
        @default null
      */
      cookieDomain: defaults.cookieDomain,

      /**
        The name of the cookie the store stores its data in.

        @property cookieName
        @readOnly
        @static
        @type String
        @default 'ember_simple_auth:'
      */
      cookieName: defaults.cookieName,

      /**
        The expiration time in seconds to use for the cookie. A value of `null`
        will make the cookie a session cookie that expires when the browser is
        closed.

        @property cookieExpirationTime
        @readOnly
        @static
        @type Integer
        @default null
      */
      cookieExpirationTime: defaults.cookieExpirationTime,

      /**
        @method load
        @private
      */
      load: loadConfig(defaults)
    };
  });
define("simple-auth-cookie-store/ember", 
  ["./initializer"],
  function(__dependency1__) {
    "use strict";
    var initializer = __dependency1__["default"];

    Ember.onLoad('Ember.Application', function(Application) {
      Application.initializer(initializer);
    });
  });
define("simple-auth-cookie-store/initializer", 
  ["./configuration","simple-auth/utils/get-global-config","simple-auth-cookie-store/stores/cookie","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Configuration = __dependency1__["default"];
    var getGlobalConfig = __dependency2__["default"];
    var Store = __dependency3__["default"];

    __exports__["default"] = {
      name:       'simple-auth-cookie-store',
      before:     'simple-auth',
      initialize: function(container, application) {
        var config = getGlobalConfig('simple-auth-cookie-store');
        Configuration.load(container, config);
        container.register('simple-auth-session-store:cookie', Store);
      }
    };
  });
define("simple-auth-cookie-store/stores/cookie", 
  ["simple-auth/stores/base","simple-auth/utils/objects-are-equal","./../configuration","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Base = __dependency1__["default"];
    var objectsAreEqual = __dependency2__["default"];
    var Configuration = __dependency3__["default"];

    /**
      Store that saves its data in a cookie.

      __In order to keep multiple tabs/windows of an application in sync, this
      store has to periodically (every 500ms) check the cookie__ for changes as
      there are no events that notify of changes in cookies. The recommended
      alternative is `Stores.LocalStorage` that also persistently stores data but
      instead of cookies relies on the `localStorage` API and does not need to poll
      for external changes.

      By default the cookie store will use a session cookie that expires and is
      deleted when the browser is closed. The cookie expiration period can be
      configured via setting
      [`Stores.Cooke#cookieExpirationTime`](#SimpleAuth-Stores-Cookie-cookieExpirationTime)
      though. This can also be used to implement "remember me" functionality that
      will either store the session persistently or in a session cookie depending
      whether the user opted in or not:

      ```js
      // app/controllers/login.js
      import LoginControllerMixin from 'simple-auth/mixins/login-controller-mixin';

      export default Ember.Controller.extend(LoginControllerMixin, {
        rememberMe: false,

        rememberMeChanged: function() {
          this.get('session.store').cookieExpirationTime = this.get('rememberMe') ? (14 * 24 * 60 * 60) : null;
        }.observes('rememberMe')
      });
      ```

      _The factory for this store is registered as
      `'simple-auth-session-store:cookie'` in Ember's container._

      @class Cookie
      @namespace SimpleAuth.Stores
      @module simple-auth-cookie-store/stores/cookie
      @extends Stores.Base
    */
    __exports__["default"] = Base.extend({

      /**
        The domain to use for the cookie, e.g., "example.com", ".example.com"
        (includes all subdomains) or "subdomain.example.com". If not configured the
        cookie domain defaults to the domain the session was authneticated on.

        This value can be configured via
        [`SimpleAuth.Configuration.CookieStore#cookieDomain`](#SimpleAuth-Configuration-CookieStore-cookieDomain).

        @property cookieDomain
        @type String
        @default null
      */
      cookieDomain: null,

      /**
        The name of the cookie the store stores its data in.

        This value can be configured via
        [`SimpleAuth.Configuration.CookieStore#cookieName`](#SimpleAuth-Configuration-CookieStore-cookieName).

        @property cookieName
        @readOnly
        @type String
      */
      cookieName: 'ember_simple_auth:session',

      /**
        The expiration time in seconds to use for the cookie. A value of `null`
        will make the cookie a session cookie that expires when the browser is
        closed.

        This value can be configured via
        [`SimpleAuth.Configuration.CookieStore#cookieExpirationTime`](#SimpleAuth-Configuration-CookieStore-cookieExpirationTime).

        @property cookieExpirationTime
        @readOnly
        @type Integer
      */
      cookieExpirationTime: null,

      /**
        @property _secureCookies
        @private
      */
      _secureCookies: window.location.protocol === 'https:',

      /**
        @property _syncDataTimeout
        @private
      */
      _syncDataTimeout: null,

      /**
        @method init
        @private
      */
      init: function() {
        this.cookieName           = Configuration.cookieName;
        this.cookieExpirationTime = Configuration.cookieExpirationTime;
        this.cookieDomain         = Configuration.cookieDomain;
        this.syncData();
      },

      /**
        Persists the `data` in session cookies.

        @method persist
        @param {Object} data The data to persist
      */
      persist: function(data) {
        data           = JSON.stringify(data || {});
        var expiration = !!this.cookieExpirationTime ? new Date().getTime() + this.cookieExpirationTime * 1000 : null;
        this.write(data, expiration);
        this._lastData = this.restore();
      },

      /**
        Restores all data currently saved in the cookie as a plain object.

        @method restore
        @return {Object} All data currently persisted in the cookie
      */
      restore: function() {
        var data = this.read();
        if (Ember.isEmpty(data)) {
          return {};
        } else {
          return JSON.parse(data);
        }
      },

      /**
        Clears the store by deleting all session cookies prefixed with the
        `cookieName` (see
        [`SimpleAuth.Stores.Cookie#cookieName`](#SimpleAuth-Stores-Cookie-cookieName)).

        @method clear
      */
      clear: function() {
        this.write(null, 0);
        this._lastData = {};
      },

      /**
        @method read
        @private
      */
      read: function() {
        var value = document.cookie.match(new RegExp(this.cookieName + name + '=([^;]+)')) || [];
        return decodeURIComponent(value[1] || '');
      },

      /**
        @method write
        @private
      */
      write: function(value, expiration) {
        var path    = '; path=/';
        var domain  = Ember.isEmpty(this.cookieDomain) ? '' : '; domain=' + this.cookieDomain;
        var expires = Ember.isEmpty(expiration) ? '' : '; expires=' + new Date(expiration).toUTCString();
        var secure  = !!this._secureCookies ? ';secure' : '';
        document.cookie = this.cookieName + '=' + encodeURIComponent(value) + domain + path + expires + secure;
      },

      /**
        @method syncData
        @private
      */
      syncData: function() {
        var data = this.restore();
        if (!objectsAreEqual(data, this._lastData)) {
          this._lastData = data;
          this.trigger('sessionDataUpdated', data);
        }
        if (!Ember.testing) {
          Ember.run.cancel(this._syncDataTimeout);
          this._syncDataTimeout = Ember.run.later(this, this.syncData, 500);
        }
      }
    });
  });
define('simple-auth/stores/base',  ['exports'], function(__exports__) {
  __exports__['default'] = global.SimpleAuth.Stores.Base;
});
define('simple-auth/utils/objects-are-equal',  ['exports'], function(__exports__) {
  __exports__['default'] = global.SimpleAuth.Utils.objectsAreEqual;
});
define('simple-auth/utils/get-global-config',  ['exports'], function(__exports__) {
  __exports__['default'] = global.SimpleAuth.Utils.getGlobalConfig;
});
define('simple-auth/utils/load-config',  ['exports'], function(__exports__) {
  __exports__['default'] = global.SimpleAuth.Utils.loadConfig;
});

var initializer   = requireModule('simple-auth-cookie-store/initializer')['default'];
var Configuration = requireModule('simple-auth-cookie-store/configuration')['default'];
var Cookie        = requireModule('simple-auth-cookie-store/stores/cookie')['default'];

global.SimpleAuth.Configuration.CookieStore = Configuration;
global.SimpleAuth.Stores.Cookie             = Cookie;

requireModule('simple-auth-cookie-store/ember');
})((typeof global !== 'undefined') ? global : window);
