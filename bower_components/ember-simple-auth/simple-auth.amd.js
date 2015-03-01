(function(global) {
  var define = global.define;
  var require = global.require;
  var Ember = global.Ember;
  if (typeof Ember === 'undefined' && typeof require !== 'undefined') {
    Ember = require('ember');
  }

Ember.libraries.register('Ember Simple Auth', '0.7.2');

define("simple-auth/authenticators/base", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
      The base for all authenticators. __This serves as a starting point for
      implementing custom authenticators and must not be used directly.__

      The authenticator authenticates the session. The actual mechanism used to do
      this might e.g. be posting a set of credentials to a server and in exchange
      retrieving an access token, initiating authentication against an external
      provider like Facebook etc. and depends on the specific authenticator. Any
      data that the authenticator receives upon successful authentication and
      resolves with from the
      [`Authenticators.Base#authenticate`](#SimpleAuth-Authenticators-Base-authenticate)
      method is stored in the session and can then be used by the authorizer (see
      [`Authorizers.Base`](#SimpleAuth-Authorizers-Base)).

      The authenticator also decides whether a set of data that was restored from
      the session store (see
      [`Stores.Base`](#SimpleAuth-Stores-Base)) is sufficient for the session to be
      authenticated or not.

      __Custom authenticators have to be registered with Ember's dependency
      injection container__ so that the session can retrieve an instance, e.g.:

      ```js
      import Base from 'simple-auth/authenticators/base';

      var CustomAuthenticator = Base.extend({
        ...
      });

      Ember.Application.initializer({
        name: 'authentication',
        initialize: function(container, application) {
          container.register('authenticator:custom', CustomAuthenticator);
        }
      });
      ```

      ```js
      // app/controllers/login.js
      import AuthenticationControllerMixin from 'simple-auth/mixins/authentication-controller-mixin';

      export default Ember.Controller.extend(AuthenticationControllerMixin, {
        authenticator: 'authenticator:custom'
      });
      ```

      @class Base
      @namespace SimpleAuth.Authenticators
      @module simple-auth/authenticators/base
      @extends Ember.Object
      @uses Ember.Evented
    */
    __exports__["default"] = Ember.Object.extend(Ember.Evented, {
      /**
        __Triggered when the data that constitutes the session is updated by the
        authenticator__. This might happen e.g. because the authenticator refreshes
        it or an event from is triggered from an external authentication provider.
        The session automatically catches that event, passes the updated data back
        to the authenticator's
        [SimpleAuth.Authenticators.Base#restore](#SimpleAuth-Authenticators-Base-restore)
        method and handles the result of that invocation accordingly.

        @event sessionDataUpdated
        @param {Object} data The updated session data
      */
      /**
        __Triggered when the data that constitutes the session is invalidated by
        the authenticator__. This might happen e.g. because the date expires or an
        event is triggered from an external authentication provider. The session
        automatically catches that event and invalidates itself.

        @event sessionDataInvalidated
        @param {Object} data The updated session data
      */

      /**
        Restores the session from a set of properties. __This method is invoked by
        the session either after the application starts up and session data was
        restored from the store__ or when properties in the store have changed due
        to external events (e.g. in another tab) and the new set of properties
        needs to be re-checked for whether it still constitutes an authenticated
        session.

        __This method returns a promise. A resolving promise will result in the
        session being authenticated.__ Any properties the promise resolves with
        will be saved in and accessible via the session. In most cases the `data`
        argument will simply be forwarded through the promise. A rejecting promise
        indicates that authentication failed and the session will remain unchanged.

        `SimpleAuth.Authenticators.Base`'s implementation always returns a
        rejecting promise.

        @method restore
        @param {Object} data The data to restore the session from
        @return {Ember.RSVP.Promise} A promise that when it resolves results in the session being authenticated
      */
      restore: function(data) {
        return new Ember.RSVP.reject();
      },

      /**
        Authenticates the session with the specified `options`. These options vary
        depending on the actual authentication mechanism the authenticator
        implements (e.g. a set of credentials or a Facebook account id etc.). __The
        session will invoke this method when an action in the application triggers
        authentication__ (see
        [SimpleAuth.AuthenticationControllerMixin.actions#authenticate](#SimpleAuth-AuthenticationControllerMixin-authenticate)).

        __This method returns a promise. A resolving promise will result in the
        session being authenticated.__ Any properties the promise resolves with
        will be saved in and accessible via the session. A rejecting promise
        indicates that authentication failed and the session will remain unchanged.

        `SimpleAuth.Authenticators.Base`'s implementation always returns a
        rejecting promise and thus never authenticates the session.

        @method authenticate
        @param {Any} [...options] The arguments that the authenticator requires to authenticate the session
        @return {Ember.RSVP.Promise} A promise that when it resolves results in the session being authenticated
      */
      authenticate: function(options) {
        return new Ember.RSVP.reject();
      },

      /**
        This callback is invoked when the session is invalidated. While the session
        will invalidate itself and clear all session properties, it might be
        necessary for some authenticators to perform additional tasks (e.g.
        invalidating an access token on the server), which should be done in this
        method.

        __This method returns a promise. A resolving promise will result in the
        session being invalidated.__ A rejecting promise will result in the session
        invalidation being intercepted and the session being left authenticated.

        `SimpleAuth.Authenticators.Base`'s implementation always returns a
        resolving promise and thus never intercepts session invalidation.

        @method invalidate
        @param {Object} data The data that the session currently holds
        @return {Ember.RSVP.Promise} A promise that when it resolves results in the session being invalidated
      */
      invalidate: function(data) {
        return new Ember.RSVP.resolve();
      }
    });
  });
define("simple-auth/authorizers/base", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
      The base for all authorizers. __This serves as a starting point for
      implementing custom authorizers and must not be used directly.__

      __The authorizer preprocesses all XHR requests__ (except ones to 3rd party
      origins, see
      [Configuration.crossOriginWhitelist](#SimpleAuth-Configuration-crossOriginWhitelist))
      and makes sure they have the required data attached that allows the server to
      identify the user making the request. This data might be an HTTP header,
      query string parameters in the URL, cookies etc. __The authorizer has to fit
      the authenticator__ (see
      [SimpleAuth.Authenticators.Base](#SimpleAuth-Authenticators-Base))
      as it relies on data that the authenticator acquires during authentication.

      @class Base
      @namespace SimpleAuth.Authorizers
      @module simple-auth/authorizers/base
      @extends Ember.Object
    */
    __exports__["default"] = Ember.Object.extend({
      /**
        The session the authorizer gets the data it needs to authorize requests
        from.

        @property session
        @readOnly
        @type SimpleAuth.Session
        @default the session instance
      */
      session: null,

      /**
        Authorizes an XHR request by adding some sort of secret information that
        allows the server to identify the user making the request (e.g. a token in
        the `Authorization` header or some other secret in the query string etc.).

        `SimpleAuth.Authorizers.Base`'s implementation does nothing.

        @method authorize
        @param {jqXHR} jqXHR The XHR request to authorize (see http://api.jquery.com/jQuery.ajax/#jqXHR)
        @param {Object} requestOptions The options as provided to the `$.ajax` method (see http://api.jquery.com/jQuery.ajaxPrefilter/)
      */
      authorize: function(jqXHR, requestOptions) {
      }
    });
  });
define("simple-auth/configuration", 
  ["simple-auth/utils/load-config","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var loadConfig = __dependency1__["default"];

    var defaults = {
      authenticationRoute:         'login',
      routeAfterAuthentication:    'index',
      routeIfAlreadyAuthenticated: 'index',
      sessionPropertyName:         'session',
      authorizer:                  null,
      session:                     'simple-auth-session:main',
      store:                       'simple-auth-session-store:local-storage',
      localStorageKey:             'ember_simple_auth:session',
      crossOriginWhitelist:        [],
      applicationRootUrl:          null
    };

    /**
      Ember Simple Auth's configuration object.

      To change any of these values, set them on the application's environment
      object:

      ```js
      ENV['simple-auth'] = {
        authenticationRoute: 'sign-in'
      };
      ```

      @class Configuration
      @namespace SimpleAuth
      @module simple-auth/configuration
    */
    __exports__["default"] = {
      /**
        The route to transition to for authentication.

        @property authenticationRoute
        @readOnly
        @static
        @type String
        @default 'login'
      */
      authenticationRoute: defaults.authenticationRoute,

      /**
        The route to transition to after successful authentication.

        @property routeAfterAuthentication
        @readOnly
        @static
        @type String
        @default 'index'
      */
      routeAfterAuthentication: defaults.routeAfterAuthentication,

      /**
        The route to transition to if a route that implements
        [`UnauthenticatedRouteMixin`](#SimpleAuth-UnauthenticatedRouteMixin) is
        accessed when the session is authenticated.

        @property routeIfAlreadyAuthenticated
        @readOnly
        @static
        @type String
        @default 'index'
      */
      routeIfAlreadyAuthenticated: defaults.routeIfAlreadyAuthenticated,

      /**
        The name of the property that the session is injected with into routes and
        controllers.

        @property sessionPropertyName
        @readOnly
        @static
        @type String
        @default 'session'
      */
      sessionPropertyName: defaults.sessionPropertyName,

      /**
        The authorizer factory to use as it is registered with Ember's container,
        see
        [Ember's API docs](http://emberjs.com/api/classes/Ember.Application.html#method_register);
        when the application does not interact with a server that requires
        authorized requests, no auzthorizer is needed.

        @property authorizer
        @readOnly
        @static
        @type String
        @default null
      */
      authorizer: defaults.authorizer,

      /**
        The session factory to use as it is registered with Ember's container,
        see
        [Ember's API docs](http://emberjs.com/api/classes/Ember.Application.html#method_register).

        @property session
        @readOnly
        @static
        @type String
        @default 'simple-auth-session:main'
      */
      session: defaults.session,

      /**
        The store factory to use as it is registered with Ember's container, see
        [Ember's API docs](http://emberjs.com/api/classes/Ember.Application.html#method_register).

        @property store
        @readOnly
        @static
        @type String
        @default simple-auth-session-store:local-storage
      */
      store: defaults.store,

      /**
        The key the store stores the data in.

        @property key
        @type String
        @default 'ember_simple_auth:session'
      */
      localStorageKey: defaults.localStorageKey,

      /**
        Ember Simple Auth will never authorize requests going to a different origin
        than the one the Ember.js application was loaded from; to explicitely
        enable authorization for additional origins, whitelist those origins with
        this setting. _Beware that origins consist of protocol, host and port (port
        can be left out when it is 80 for HTTP or 443 for HTTPS)_, e.g.
        `http://domain.com:1234`, `https://external.net`. You can also whitelist
        all external origins by specifying `[*]`.

        @property crossOriginWhitelist
        @readOnly
        @static
        @type Array
        @default []
      */
      crossOriginWhitelist: defaults.crossOriginWhitelist,

      /**
        @property applicationRootUrl
        @private
      */
      applicationRootUrl: defaults.applicationRootUrl,

      /**
        @method load
        @private
      */
      load: loadConfig(defaults, function(container, config) {
        this.applicationRootUrl = container.lookup('router:main').get('rootURL') || '/';
      })
    };
  });
define("simple-auth/ember", 
  ["./initializer"],
  function(__dependency1__) {
    "use strict";
    var initializer = __dependency1__["default"];

    Ember.onLoad('Ember.Application', function(Application) {
      Application.initializer(initializer);
    });
  });
define("simple-auth/initializer", 
  ["./configuration","./utils/get-global-config","./setup","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Configuration = __dependency1__["default"];
    var getGlobalConfig = __dependency2__["default"];
    var setup = __dependency3__["default"];

    __exports__["default"] = {
      name:       'simple-auth',
      initialize: function(container, application) {
        var config = getGlobalConfig('simple-auth');
        Configuration.load(container, config);
        setup(container, application);
      }
    };
  });
define("simple-auth/mixins/application-route-mixin", 
  ["./../configuration","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Configuration = __dependency1__["default"];

    var routeEntryComplete = false;

    /**
      The mixin for the application route; defines actions to authenticate the
      session as well as to invalidate it. These actions can be used in all
      templates like this:

      ```handlebars
      {{#if session.isAuthenticated}}
        <a {{ action 'invalidateSession' }}>Logout</a>
      {{else}}
        <a {{ action 'authenticateSession' }}>Login</a>
      {{/if}}
      ```

      or in the case that the application uses a dedicated route for logging in:

      ```handlebars
      {{#if session.isAuthenticated}}
        <a {{ action 'invalidateSession' }}>Logout</a>
      {{else}}
        {{#link-to 'login'}}Login{{/link-to}}
      {{/if}}
      ```

      This mixin also defines actions that are triggered whenever the session is
      successfully authenticated or invalidated and whenever authentication or
      invalidation fails. These actions provide a good starting point for adding
      custom behavior to these events.

      __When this mixin is used and the application's `ApplicationRoute` defines
      the `beforeModel` method, that method has to call `_super`.__

      Using this mixin is optional. Without using it, the session's events will not
      be automatically translated into route actions but would have to be handled
      inidivially, e.g. in an initializer:

      ```js
      Ember.Application.initializer({
        name:       'authentication',
        after:      'simple-auth',
        initialize: function(container, application) {
          var applicationRoute = container.lookup('route:application');
          var session          = container.lookup('simple-auth-session:main');
          // handle the session events
          session.on('sessionAuthenticationSucceeded', function() {
            applicationRoute.transitionTo('index');
          });
        }
      });
      ```

      @class ApplicationRouteMixin
      @namespace SimpleAuth
      @module simple-auth/mixins/application-route-mixin
      @extends Ember.Mixin
      @static
    */
    __exports__["default"] = Ember.Mixin.create({
      /**
        @method activate
        @private
      */
      activate: function () {
        routeEntryComplete = true;
        this._super();
      },

      /**
        @method beforeModel
        @private
      */
      beforeModel: function(transition) {
        this._super(transition);
        if (!this.get('_authEventListenersAssigned')) {
          this.set('_authEventListenersAssigned', true);
          var _this = this;
          Ember.A([
            'sessionAuthenticationSucceeded',
            'sessionAuthenticationFailed',
            'sessionInvalidationSucceeded',
            'sessionInvalidationFailed',
            'authorizationFailed'
          ]).forEach(function(event) {
            _this.get(Configuration.sessionPropertyName).on(event, function(error) {
              Array.prototype.unshift.call(arguments, event);
              var target = routeEntryComplete ? _this : transition;
              target.send.apply(target, arguments);
            });
          });
        }
      },

      actions: {
        /**
          This action triggers transition to the
          [`Configuration.authenticationRoute`](#SimpleAuth-Configuration-authenticationRoute).
          It can be used in templates as shown above. It is also triggered
          automatically by the
          [`AuthenticatedRouteMixin`](#SimpleAuth-AuthenticatedRouteMixin) whenever
          a route that requries authentication is accessed but the session is not
          currently authenticated.

          __For an application that works without an authentication route (e.g.
          because it opens a new window to handle authentication there), this is
          the action to override, e.g.:__

          ```js
          App.ApplicationRoute = Ember.Route.extend(SimpleAuth.ApplicationRouteMixin, {
            actions: {
              authenticateSession: function() {
                this.get('session').authenticate('authenticator:custom', {});
              }
            }
          });
          ```

          @method actions.authenticateSession
        */
        authenticateSession: function() {
          this.transitionTo(Configuration.authenticationRoute);
        },

        /**
          This action is triggered whenever the session is successfully
          authenticated. If there is a transition that was previously intercepted
          by
          [`AuthenticatedRouteMixin#beforeModel`](#SimpleAuth-AuthenticatedRouteMixin-beforeModel)
          it will retry it. If there is no such transition, this action transitions
          to the
          [`Configuration.routeAfterAuthentication`](#SimpleAuth-Configuration-routeAfterAuthentication).

          @method actions.sessionAuthenticationSucceeded
        */
        sessionAuthenticationSucceeded: function() {
          var attemptedTransition = this.get(Configuration.sessionPropertyName).get('attemptedTransition');
          if (attemptedTransition) {
            attemptedTransition.retry();
            this.get(Configuration.sessionPropertyName).set('attemptedTransition', null);
          } else {
            this.transitionTo(Configuration.routeAfterAuthentication);
          }
        },

        /**
          This action is triggered whenever session authentication fails. The
          `error` argument is the error object that the promise the authenticator
          returns rejects with. (see
          [`Authenticators.Base#authenticate`](#SimpleAuth-Authenticators-Base-authenticate)).

          It can be overridden to display error messages etc.:

          ```js
          App.ApplicationRoute = Ember.Route.extend(SimpleAuth.ApplicationRouteMixin, {
            actions: {
              sessionAuthenticationFailed: function(error) {
                this.controllerFor('application').set('loginErrorMessage', error.message);
              }
            }
          });
          ```

          @method actions.sessionAuthenticationFailed
          @param {any} error The error the promise returned by the authenticator rejects with, see [`Authenticators.Base#authenticate`](#SimpleAuth-Authenticators-Base-authenticate)
        */
        sessionAuthenticationFailed: function(error) {
        },

        /**
          This action invalidates the session (see
          [`Session#invalidate`](#SimpleAuth-Session-invalidate)).
          If invalidation succeeds, it reloads the application (see
          [`ApplicationRouteMixin#sessionInvalidationSucceeded`](#SimpleAuth-ApplicationRouteMixin-sessionInvalidationSucceeded)).

          @method actions.invalidateSession
        */
        invalidateSession: function() {
          this.get(Configuration.sessionPropertyName).invalidate();
        },

        /**
          This action is invoked whenever the session is successfully invalidated.
          It reloads the Ember.js application by redirecting the browser to the
          application's root URL so that all in-memory data (such as Ember Data
          stores etc.) gets cleared. The root URL is automatically retrieved from
          the Ember.js application's router (see
          http://emberjs.com/guides/routing/#toc_specifying-a-root-url).

          If your Ember.js application will be used in an environment where the
          users don't have direct access to any data stored on the client (e.g.
          [cordova](http://cordova.apache.org)) this action can be overridden to
          simply transition to the `'index'` route.

          @method actions.sessionInvalidationSucceeded
        */
        sessionInvalidationSucceeded: function() {
          if (!Ember.testing) {
            window.location.replace(Configuration.applicationRootUrl);
          }
        },

        /**
          This action is invoked whenever session invalidation fails. This mainly
          serves as an extension point to add custom behavior and does nothing by
          default.

          @method actions.sessionInvalidationFailed
          @param {any} error The error the promise returned by the authenticator rejects with, see [`Authenticators.Base#invalidate`](#SimpleAuth-Authenticators-Base-invalidate)
        */
        sessionInvalidationFailed: function(error) {
        },

        /**
          This action is invoked when an authorization error occurs (which is
          the case __when the server responds with HTTP status 401__). It
          invalidates the session and reloads the application (see
          [`ApplicationRouteMixin#sessionInvalidationSucceeded`](#SimpleAuth-ApplicationRouteMixin-sessionInvalidationSucceeded)).

          @method actions.authorizationFailed
        */
        authorizationFailed: function() {
          if (this.get(Configuration.sessionPropertyName).get('isAuthenticated')) {
            this.get(Configuration.sessionPropertyName).invalidate();
          }
        }
      }
    });
  });
define("simple-auth/mixins/authenticated-route-mixin", 
  ["./../configuration","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Configuration = __dependency1__["default"];

    /**
      This mixin is for routes that require the session to be authenticated to be
      accessible. Including this mixin in a route automatically adds a hook that
      enforces the session to be authenticated and redirects to the
      [`Configuration.authenticationRoute`](#SimpleAuth-Configuration-authenticationRoute)
      if it is not.

      ```js
      // app/routes/protected.js
      import AuthenticatedRouteMixin from 'simple-auth/mixins/authenticated-route-mixin';

      export default Ember.Route.extend(AuthenticatedRouteMixin);
      ```

      `AuthenticatedRouteMixin` performs the redirect in the `beforeModel` method
      so that in all methods executed after that the session is guaranteed to be
      authenticated. __If `beforeModel` is overridden, ensure that the custom
      implementation calls `this._super(transition)`__ so that the session
      enforcement code is actually executed.

      @class AuthenticatedRouteMixin
      @namespace SimpleAuth
      @module simple-auth/mixins/authenticated-route-mixin
      @extends Ember.Mixin
      @static
    */
    __exports__["default"] = Ember.Mixin.create({
      /**
        This method implements the enforcement of the session being authenticated.
        If the session is not authenticated, the current transition will be aborted
        and a redirect will be triggered to the
        [`Configuration.authenticationRoute`](#SimpleAuth-Configuration-authenticationRoute).
        The method also saves the intercepted transition so that it can be retried
        after the session has been authenticated (see
        [`ApplicationRouteMixin#sessionAuthenticationSucceeded`](#SimpleAuth-ApplicationRouteMixin-sessionAuthenticationSucceeded)).

        @method beforeModel
        @param {Transition} transition The transition that lead to this route
      */
      beforeModel: function(transition) {
        this._super(transition);
        if (!this.get(Configuration.sessionPropertyName).get('isAuthenticated')) {
          transition.abort();
          this.get(Configuration.sessionPropertyName).set('attemptedTransition', transition);
          Ember.assert('The route configured as Configuration.authenticationRoute cannot implement the AuthenticatedRouteMixin mixin as that leads to an infinite transitioning loop.', this.get('routeName') !== Configuration.authenticationRoute);
          transition.send('authenticateSession');
        }
      }
    });
  });
define("simple-auth/mixins/authentication-controller-mixin", 
  ["./../configuration","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Configuration = __dependency1__["default"];

    /**
      This mixin is for the controller that handles the
      [`Configuration.authenticationRoute`](#SimpleAuth-Configuration-authenticationRoute).
      It provides the `authenticate` action that will authenticate the session with
      the configured authenticator (see
      [`AuthenticationControllerMixin#authenticator`](#SimpleAuth-AuthenticationControllerMixin-authenticator)).

      @class AuthenticationControllerMixin
      @namespace SimpleAuth
      @module simple-auth/mixins/authentication-controller-mixin
      @extends Ember.Mixin
    */
    __exports__["default"] = Ember.Mixin.create({
      /**
        The authenticator factory to use as it is registered with Ember's
        container, see
        [Ember's API docs](http://emberjs.com/api/classes/Ember.Application.html#method_register).

        @property authenticator
        @type String
        @default null
      */
      authenticator: null,

      actions: {
        /**
          This action will authenticate the session with the configured
          authenticator (see
          [`AuthenticationControllerMixin#authenticator`](#SimpleAuth-AuthenticationControllerMixin-authenticator),
          [`Session#authenticate`](#SimpleAuth-Session-authenticate)).

          @method actions.authenticate
          @param {Object} options Any options the authenticator needs to authenticate the session
        */
        authenticate: function(options) {
          var authenticator = this.get('authenticator');
          Ember.assert('AuthenticationControllerMixin/LoginControllerMixin require the authenticator property to be set on the controller', !Ember.isEmpty(authenticator));
          return this.get(Configuration.sessionPropertyName).authenticate(authenticator, options);
        }
      }
    });
  });
define("simple-auth/mixins/login-controller-mixin", 
  ["./../configuration","./authentication-controller-mixin","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Configuration = __dependency1__["default"];
    var AuthenticationControllerMixin = __dependency2__["default"];

    /**
      This mixin is for the controller that handles the
      [`Configuration.authenticationRoute`](#SimpleAuth-Configuration-authenticationRoute)
      if the used authentication mechanism works with a login form that asks for
      user credentials. It provides the `authenticate` action that will
      authenticate the session with the configured authenticator when invoked.
      __This is a specialization of
      [`AuthenticationControllerMixin`](#SimpleAuth-AuthenticationControllerMixin).__

      Accompanying the controller that this mixin is mixed in the application needs
      to have a `login` template with the fields `identification` and `password` as
      well as an actionable button or link that triggers the `authenticate` action,
      e.g.:

      ```handlebars
      <form {{action 'authenticate' on='submit'}}>
        <label for="identification">Login</label>
        {{input value=identification placeholder='Enter Login'}}
        <label for="password">Password</label>
        {{input value=password placeholder='Enter Password' type='password'}}
        <button type="submit">Login</button>
      </form>
      ```

      @class LoginControllerMixin
      @namespace SimpleAuth
      @module simple-auth/mixins/login-controller-mixin
      @extends SimpleAuth.AuthenticationControllerMixin
    */
    __exports__["default"] = Ember.Mixin.create(AuthenticationControllerMixin, {
      actions: {
        /**
          This action will authenticate the session with the configured
          authenticator (see
          [AuthenticationControllerMixin#authenticator](#SimpleAuth-Authentication-authenticator))
          if both `identification` and `password` are non-empty. It passes both
          values to the authenticator.

          __The action also resets the `password` property so sensitive data does
          not stay in memory for longer than necessary.__

          @method actions.authenticate
        */
        authenticate: function() {
          var data = this.getProperties('identification', 'password');
          this.set('password', null);
          return this._super(data);
        }
      }
    });
  });
define("simple-auth/mixins/unauthenticated-route-mixin", 
  ["./../configuration","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Configuration = __dependency1__["default"];

    /**
      This mixin is for routes that should only be accessible if the session is
      not authenticated. This is e.g. the case for the login route that should not
      be accessible when the session is already authenticated. Including this mixin
      in a route automatically adds a hook that redirects to the
      [`Configuration.routeIfAlreadyAuthenticated`](#SimpleAuth-Configuration-routeIfAlreadyAuthenticated),
      which defaults to `'index'`.

      ```js
      // app/routes/login.js
      import UnauthenticatedRouteMixin from 'simple-auth/mixins/unauthenticated-route-mixin';

      export default Ember.Route.extend(UnauthenticatedRouteMixin);
      ```

      `UnauthenticatedRouteMixin` performs the redirect in the `beforeModel`
      method. __If `beforeModel` is overridden, ensure that the custom
      implementation calls `this._super(transition)`__.

      @class UnauthenticatedRouteMixin
      @namespace SimpleAuth
      @module simple-auth/mixins/unauthenticated-route-mixin
      @extends Ember.Mixin
      @static
    */
    __exports__["default"] = Ember.Mixin.create({
      /**
        This method implements the enforcement of the session not being
        authenticated. If the session is authenticated, the current transition will
        be aborted and a redirect will be triggered to the
        [`Configuration.routeIfAlreadyAuthenticated`](#SimpleAuth-Configuration-routeIfAlreadyAuthenticated).

        @method beforeModel
        @param {Transition} transition The transition that lead to this route
      */
      beforeModel: function(transition) {
        if (this.get(Configuration.sessionPropertyName).get('isAuthenticated')) {
          transition.abort();
          Ember.assert('The route configured as Configuration.routeIfAlreadyAuthenticated cannot implement the UnauthenticatedRouteMixin mixin as that leads to an infinite transitioning loop.', this.get('routeName') !== Configuration.routeIfAlreadyAuthenticated);
          this.transitionTo(Configuration.routeIfAlreadyAuthenticated);
        }
      }
    });
  });
define("simple-auth/session", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
      __The session provides access to the current authentication state as well as
      any data the authenticator resolved with__ (see
      [`Authenticators.Base#authenticate`](#SimpleAuth-Authenticators-Base-authenticate)).
      It is created when Ember Simple Auth is set up and __injected into all
      controllers and routes so that these parts of the application can always
      access the current authentication state and other data__, depending on the
      authenticator in use and whether the session is actually authenticated (see
      [`Authenticators.Base`](#SimpleAuth-Authenticators-Base)).

      The session also provides methods to authenticate and to invalidate itself
      (see
      [`Session#authenticate`](#SimpleAuth-Session-authenticate),
      [`Session#invaldiate`](#SimpleAuth-Session-invaldiate)).
      These methods are usually invoked through actions from routes or controllers.
      To authenticate the session manually, simple call the
      [`Session#authenticate`](#SimpleAuth-Session-authenticate)
      method with the authenticator factory to use as well as any options the
      authenticator needs to authenticate the session:

      ```js
      this.get('session').authenticate('authenticator:custom', { some: 'option' }).then(function() {
        // authentication was successful
      }, function() {
        // authentication failed
      });
      ```

      The session also observes the store and - if it is authenticated - the
      authenticator for changes (see
      [`Authenticators.Base`](#SimpleAuth-Authenticators-Base)
      end [`Stores.Base`](#SimpleAuth-Stores-Base)).

      @class Session
      @namespace SimpleAuth
      @module simple-auth/session
      @extends Ember.ObjectProxy
      @uses Ember.Evented
    */
    __exports__["default"] = Ember.ObjectProxy.extend(Ember.Evented, {
      /**
        Triggered __whenever the session is successfully authenticated__. When the
        application uses the
        [`ApplicationRouteMixin` mixin](#SimpleAuth-ApplicationRouteMixin),
        [`ApplicationRouteMixin.actions#sessionAuthenticationSucceeded`](#SimpleAuth-ApplicationRouteMixin-sessionAuthenticationSucceeded)
        will be invoked whenever this event is triggered.

        @event sessionAuthenticationSucceeded
      */
      /**
        Triggered __whenever an attempt to authenticate the session fails__. When
        the application uses the
        [`ApplicationRouteMixin` mixin](#SimpleAuth-ApplicationRouteMixin),
        [`ApplicationRouteMixin.actions#sessionAuthenticationFailed`](#SimpleAuth-ApplicationRouteMixin-sessionAuthenticationFailed)
        will be invoked whenever this event is triggered.

        @event sessionAuthenticationFailed
        @param {Object} error The error object; this depends on the authenticator in use, see [SimpleAuth.Authenticators.Base#authenticate](#SimpleAuth-Authenticators-Base-authenticate)
      */
      /**
        Triggered __whenever the session is successfully invalidated__. When the
        application uses the
        [`ApplicationRouteMixin` mixin](#SimpleAuth-ApplicationRouteMixin),
        [`ApplicationRouteMixin.actions#sessionInvalidationSucceeded`](#SimpleAuth-ApplicationRouteMixin-sessionInvalidationSucceeded)
        will be invoked whenever this event is triggered.

        @event sessionInvalidationSucceeded
      */
      /**
        Triggered __whenever an attempt to invalidate the session fails__. When the
        application uses the
        [`ApplicationRouteMixin` mixin](#SimpleAuth-ApplicationRouteMixin),
        [`ApplicationRouteMixin.actions#sessionInvalidationFailed`](#SimpleAuth-ApplicationRouteMixin-sessionInvalidationFailed)
        will be invoked whenever this event is triggered.

        @event sessionInvalidationFailed
        @param {Object} error The error object; this depends on the authenticator in use, see [SimpleAuth.Authenticators.Base#invalidate](#SimpleAuth-Authenticators-Base-invalidate)
      */
      /**
        Triggered __whenever the server rejects the authorization information
        passed with a request and responds with status 401__. When the application
        uses the
        [`ApplicationRouteMixin` mixin](#SimpleAuth-ApplicationRouteMixin),
        [`ApplicationRouteMixin.actions#authorizationFailed`](#SimpleAuth-ApplicationRouteMixin-authorizationFailed)
        will be invoked whenever this event is triggered.

        @event authorizationFailed
      */

      /**
        The authenticator factory to use as it is registered with Ember's
        container, see
        [Ember's API docs](http://emberjs.com/api/classes/Ember.Application.html#method_register).
        This is only set when the session is currently authenticated.

        @property authenticator
        @type String
        @readOnly
        @default null
      */
      authenticator: null,
      /**
        The store used to persist session properties.

        @property store
        @type SimpleAuth.Stores.Base
        @readOnly
        @default null
      */
      store: null,
      /**
        The Ember.js container,

        @property container
        @type Container
        @readOnly
        @default null
      */
      container: null,
      /**
        Returns whether the session is currently authenticated.

        @property isAuthenticated
        @type Boolean
        @readOnly
        @default false
      */
      isAuthenticated: false,
      /**
        @property attemptedTransition
        @private
      */
      attemptedTransition: null,
      /**
        @property content
        @private
      */
      content: {},

      /**
        Authenticates the session with an `authenticator` and appropriate
        `options`. __This delegates the actual authentication work to the
        `authenticator`__ and handles the returned promise accordingly (see
        [`Authenticators.Base#authenticate`](#SimpleAuth-Authenticators-Base-authenticate)).
        All data the authenticator resolves with will be saved in the session.

        __This method returns a promise itself. A resolving promise indicates that
        the session was successfully authenticated__ while a rejecting promise
        indicates that authentication failed and the session remains
        unauthenticated.

        @method authenticate
        @param {String} authenticator The authenticator factory to use as it is registered with Ember's container, see [Ember's API docs](http://emberjs.com/api/classes/Ember.Application.html#method_register)
        @param {Any} [...args] The arguments to pass to the authenticator; depending on the type of authenticator these might be a set of credentials, a Facebook OAuth Token, etc.
        @return {Ember.RSVP.Promise} A promise that resolves when the session was authenticated successfully
      */
      authenticate: function() {
        var args          = Array.prototype.slice.call(arguments);
        var authenticator = args.shift();
        Ember.assert('Session#authenticate requires the authenticator factory to be specified, was ' + authenticator, !Ember.isEmpty(authenticator));
        var _this            = this;
        var theAuthenticator = this.container.lookup(authenticator);
        Ember.assert('No authenticator for factory "' + authenticator + '" could be found', !Ember.isNone(theAuthenticator));
        return new Ember.RSVP.Promise(function(resolve, reject) {
          theAuthenticator.authenticate.apply(theAuthenticator, args).then(function(content) {
            _this.setup(authenticator, content, true);
            resolve();
          }, function(error) {
            _this.clear();
            _this.trigger('sessionAuthenticationFailed', error);
            reject(error);
          });
        });
      },

      /**
        Invalidates the session with the authenticator it is currently
        authenticated with (see
        [`Session#authenticator`](#SimpleAuth-Session-authenticator)). __This
        invokes the authenticator's `invalidate` method and handles the returned
        promise accordingly__ (see
        [`Authenticators.Base#invalidate`](#SimpleAuth-Authenticators-Base-invalidate)).

        __This method returns a promise itself. A resolving promise indicates that
        the session was successfully invalidated__ while a rejecting promise
        indicates that the promise returned by the `authenticator` rejected and
        thus invalidation was cancelled. In that case the session remains
        authenticated. Once the session is successfully invalidated it clears all
        of its data.

        @method invalidate
        @return {Ember.RSVP.Promise} A promise that resolves when the session was invalidated successfully
      */
      invalidate: function() {
        Ember.assert('Session#invalidate requires the session to be authenticated', this.get('isAuthenticated'));
        var _this = this;
        return new Ember.RSVP.Promise(function(resolve, reject) {
          var authenticator = _this.container.lookup(_this.authenticator);
          authenticator.invalidate(_this.content).then(function() {
            authenticator.off('sessionDataUpdated');
            _this.clear(true);
            resolve();
          }, function(error) {
            _this.trigger('sessionInvalidationFailed', error);
            reject(error);
          });
        });
      },

      /**
        @method restore
        @private
      */
      restore: function() {
        var _this = this;
        return new Ember.RSVP.Promise(function(resolve, reject) {
          var restoredContent = _this.store.restore();
          var authenticator   = restoredContent.authenticator;
          if (!!authenticator) {
            delete restoredContent.authenticator;
            _this.container.lookup(authenticator).restore(restoredContent).then(function(content) {
              _this.setup(authenticator, content);
              resolve();
            }, function() {
              _this.store.clear();
              reject();
            });
          } else {
            _this.store.clear();
            reject();
          }
        });
      },

      /**
        @method setup
        @private
      */
      setup: function(authenticator, content, trigger) {
        content = Ember.merge(Ember.merge({}, this.content), content);
        trigger = !!trigger && !this.get('isAuthenticated');
        this.beginPropertyChanges();
        this.setProperties({
          isAuthenticated: true,
          authenticator:   authenticator,
          content:         content
        });
        this.bindToAuthenticatorEvents();
        this.updateStore();
        this.endPropertyChanges();
        if (trigger) {
          this.trigger('sessionAuthenticationSucceeded');
        }
      },

      /**
        @method clear
        @private
      */
      clear: function(trigger) {
        trigger = !!trigger && this.get('isAuthenticated');
        this.beginPropertyChanges();
        this.setProperties({
          isAuthenticated: false,
          authenticator:   null,
          content:         {}
        });
        this.store.clear();
        this.endPropertyChanges();
        if (trigger) {
          this.trigger('sessionInvalidationSucceeded');
        }
      },

      /**
        @method setUnknownProperty
        @private
      */
      setUnknownProperty: function(key, value) {
        var result = this._super(key, value);
        this.updateStore();
        return result;
      },

      /**
        @method updateStore
        @private
      */
      updateStore: function() {
        var data = this.content;
        if (!Ember.isEmpty(this.authenticator)) {
          data = Ember.merge({ authenticator: this.authenticator }, data);
        }
        if (!Ember.isEmpty(data)) {
          this.store.persist(data);
        }
      },

      /**
        @method bindToAuthenticatorEvents
        @private
      */
      bindToAuthenticatorEvents: function() {
        var _this = this;
        var authenticator = this.container.lookup(this.authenticator);
        authenticator.off('sessionDataUpdated');
        authenticator.off('sessionDataInvalidated');
        authenticator.on('sessionDataUpdated', function(content) {
          _this.setup(_this.authenticator, content);
        });
        authenticator.on('sessionDataInvalidated', function(content) {
          _this.clear(true);
        });
      },

      /**
        @method bindToStoreEvents
        @private
      */
      bindToStoreEvents: function() {
        var _this = this;
        this.store.on('sessionDataUpdated', function(content) {
          var authenticator = content.authenticator;
          if (!!authenticator) {
            delete content.authenticator;
            _this.container.lookup(authenticator).restore(content).then(function(content) {
              _this.setup(authenticator, content, true);
            }, function() {
              _this.clear(true);
            });
          } else {
            _this.clear(true);
          }
        });
      }.observes('store')
    });
  });
define("simple-auth/setup", 
  ["./configuration","./session","./stores/local-storage","./stores/ephemeral","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var Configuration = __dependency1__["default"];
    var Session = __dependency2__["default"];
    var LocalStorage = __dependency3__["default"];
    var Ephemeral = __dependency4__["default"];

    function extractLocationOrigin(location) {
      if (location === '*'){
          return location;
      }
      if (Ember.typeOf(location) === 'string') {
        var link = document.createElement('a');
        link.href = location;
        //IE requires the following line when url is relative.
        //First assignment of relative url to link.href results in absolute url on link.href but link.hostname and other properties are not set
        //Second assignment of absolute url to link.href results in link.hostname and other properties being set as expected
        link.href = link.href;
        location = link;
      }
      var port = location.port;
      if (Ember.isEmpty(port)) {
        //need to include the port whether its actually present or not as some versions of IE will always set it
        port = location.protocol === 'http:' ? '80' : (location.protocol === 'https:' ? '443' : '');
      }
      return location.protocol + '//' + location.hostname + (port !== '' ? ':' + port : '');
    }

    var urlOrigins     = {};
    var crossOriginWhitelist;
    function shouldAuthorizeRequest(options) {
      if (options.crossDomain === false || crossOriginWhitelist.indexOf('*') > -1) {
        return true;
      }
      var urlOrigin = urlOrigins[options.url] = urlOrigins[options.url] || extractLocationOrigin(options.url);
      return crossOriginWhitelist.indexOf(urlOrigin) > -1;
    }

    function registerFactories(container) {
      container.register('simple-auth-session-store:local-storage', LocalStorage);
      container.register('simple-auth-session-store:ephemeral', Ephemeral);
      container.register('simple-auth-session:main', Session);
    }

    function ajaxPrefilter(options, originalOptions, jqXHR) {
      if (shouldAuthorizeRequest(options)) {
        jqXHR.__simple_auth_authorized__ = true;
        ajaxPrefilter.authorizer.authorize(jqXHR, options);
      }
    }

    function ajaxError(event, jqXHR, setting, exception) {
      if (!!jqXHR.__simple_auth_authorized__ && jqXHR.status === 401) {
        ajaxError.session.trigger('authorizationFailed');
      }
    }

    var didSetupAjaxHooks = false;

    /**
      @method setup
      @private
    **/
    __exports__["default"] = function(container, application) {
      application.deferReadiness();
      registerFactories(container);

      var store   = container.lookup(Configuration.store);
      var session = container.lookup(Configuration.session);
      session.setProperties({ store: store, container: container });
      Ember.A(['controller', 'route', 'component']).forEach(function(component) {
        container.injection(component, Configuration.sessionPropertyName, Configuration.session);
      });

      crossOriginWhitelist = Ember.A(Configuration.crossOriginWhitelist).map(function(origin) {
        return extractLocationOrigin(origin);
      });

      if (!Ember.isEmpty(Configuration.authorizer)) {
        var authorizer = container.lookup(Configuration.authorizer);
        Ember.assert('The configured authorizer "' + Configuration.authorizer + '" could not be found in the container.', !Ember.isEmpty(authorizer));
        authorizer.set('session', session);
        ajaxPrefilter.authorizer = authorizer;
        ajaxError.session = session;

        if (!didSetupAjaxHooks) {
          Ember.$.ajaxPrefilter('+*', ajaxPrefilter);
          Ember.$(document).ajaxError(ajaxError);
          didSetupAjaxHooks = true;
        }
      } else {
        Ember.Logger.info('No authorizer was configured for Ember Simple Auth - specify one if backend requests need to be authorized.');
      }

      var advanceReadiness = function() {
        application.advanceReadiness();
      };
      session.restore().then(advanceReadiness, advanceReadiness);
    }
  });
define("simple-auth/stores/base", 
  ["../utils/objects-are-equal","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var objectsAreEqual = __dependency1__["default"];

    /**
      The base for all store types. __This serves as a starting point for
      implementing custom stores and must not be used directly.__

      Stores are used to persist the session's state so it survives a page reload
      and is synchronized across multiple tabs or windows of the same application.
      The store to be used with the application can be configured on the
      application's environment object:

      ```js
      ENV['simple-auth'] = {
        store: 'simple-auth-session-store:local-storage'
      }
      ```

      @class Base
      @namespace SimpleAuth.Stores
      @module simple-auth/stores/base
      @extends Ember.Object
      @uses Ember.Evented
    */
    __exports__["default"] = Ember.Object.extend(Ember.Evented, {
      /**
        __Triggered when the data that constitutes the session changes in the
        store. This usually happens because the session is authenticated or
        invalidated in another tab or window.__ The session automatically catches
        that event, passes the updated data to its authenticator's
        [`Authenticators.Base#restore`](#SimpleAuth-Authenticators-Base-restore)
        method and handles the result of that invocation accordingly.

        @event sessionDataUpdated
        @param {Object} data The updated session data
      */

      /**
        Persists the `data` in the store. This actually replaces all currently
        stored data.

        `Stores.Base`'s implementation does nothing.

        @method persist
        @param {Object} data The data to persist
      */
      persist: function(data) {
      },

      /**
        Restores all data currently saved in the store as a plain object.

        `Stores.Base`'s implementation always returns an empty plain Object.

        @method restore
        @return {Object} The data currently persisted in the store.
      */
      restore: function() {
        return {};
      },

      /**
        Clears the store.

        `Stores.Base`'s implementation does nothing.

        @method clear
      */
      clear: function() {
      }
    });
  });
define("simple-auth/stores/ephemeral", 
  ["./base","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Base = __dependency1__["default"];

    /**
      Store that saves its data in memory and thus __is not actually persistent__.
      It does also not synchronize the session's state across multiple tabs or
      windows as those cannot share memory.

      __This store is mainly useful for testing.__

      _The factory for this store is registered as
      `'simple-auth-session-store:ephemeral'` in Ember's container._

      @class Ephemeral
      @namespace SimpleAuth.Stores
      @module simple-auth/stores/ephemeral
      @extends Stores.Base
    */
    __exports__["default"] = Base.extend({
      /**
        @method init
        @private
      */
      init: function() {
        this.clear();
      },

      /**
        Persists the `data`.

        @method persist
        @param {Object} data The data to persist
      */
      persist: function(data) {
        this._data = JSON.stringify(data || {});
      },

      /**
        Restores all data currently saved as a plain object.

        @method restore
        @return {Object} All data currently persisted
      */
      restore: function() {
        return JSON.parse(this._data) || {};
      },

      /**
        Clears the store.

        @method clear
      */
      clear: function() {
        delete this._data;
        this._data = '{}';
      }
    });
  });
define("simple-auth/stores/local-storage", 
  ["./base","../utils/objects-are-equal","../configuration","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Base = __dependency1__["default"];
    var objectsAreEqual = __dependency2__["default"];
    var Configuration = __dependency3__["default"];

    /**
      Store that saves its data in the browser's `localStorage`.

      _The factory for this store is registered as
      `'simple-auth-session-store:local-storage'` in Ember's container._

      __`Stores.LocalStorage` is Ember Simple Auth's default store.__

      @class LocalStorage
      @namespace SimpleAuth.Stores
      @module simple-auth/stores/local-storage
      @extends Stores.Base
    */
    __exports__["default"] = Base.extend({
      /**
        The key the store stores the data in.

        @property key
        @type String
        @default 'ember_simple_auth:session'
      */
      key: 'ember_simple_auth:session',

      /**
        @method init
        @private
      */
      init: function() {
        this.key = Configuration.localStorageKey;

        this.bindToStorageEvents();
      },

      /**
        Persists the `data` in the `localStorage`.

        @method persist
        @param {Object} data The data to persist
      */
      persist: function(data) {
        data = JSON.stringify(data || {});
        localStorage.setItem(this.key, data);
        this._lastData = this.restore();
      },

      /**
        Restores all data currently saved in the `localStorage` identified by the
        `keyPrefix` as one plain object.

        @method restore
        @return {Object} All data currently persisted in the `localStorage`
      */
      restore: function() {
        var data = localStorage.getItem(this.key);
        return JSON.parse(data) || {};
      },

      /**
        Clears the store by deleting all `localStorage` keys prefixed with the
        `keyPrefix`.

        @method clear
      */
      clear: function() {
        localStorage.removeItem(this.key);
        this._lastData = {};
      },

      /**
        @method bindToStorageEvents
        @private
      */
      bindToStorageEvents: function() {
        var _this = this;
        Ember.$(window).bind('storage', function(e) {
          var data = _this.restore();
          if (!objectsAreEqual(data, _this._lastData)) {
            _this._lastData = data;
            _this.trigger('sessionDataUpdated', data);
          }
        });
      }
    });
  });
define("simple-auth/utils/get-global-config", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var global = (typeof window !== 'undefined') ? window : {};

    __exports__["default"] = function(scope) {
      return Ember.get(global, 'ENV.' + scope) || {};
    }
  });
define("simple-auth/utils/load-config", 
  ["exports"],
  function(__exports__) {
    "use strict";
    __exports__["default"] = function(defaults, callback) {
      return function(container, config) {
        var wrappedConfig = Ember.Object.create(config);
        for (var property in this) {
          if (this.hasOwnProperty(property) && Ember.typeOf(this[property]) !== 'function') {
            this[property] = wrappedConfig.getWithDefault(property, defaults[property]);
          }
        }
        if (callback) {
          callback.apply(this, [container, config]);
        }
      };
    }
  });
define("simple-auth/utils/objects-are-equal", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
      @method objectsAreEqual
      @private
    */
    function objectsAreEqual(a, b) {
      if (a === b) {
        return true;
      }
      if (!(a instanceof Object) || !(b instanceof Object)) {
        return false;
      }
      if(a.constructor !== b.constructor) {
        return false;
      }

      for (var property in a) {
        if (!a.hasOwnProperty(property)) {
          continue;
        }
        if (!b.hasOwnProperty(property)) {
          return false;
        }
        if (a[property] === b[property]) {
          continue;
        }
        if (Ember.typeOf(a[property]) !== 'object') {
          return false;
        }
        if (!objectsAreEqual(a[property], b[property])) {
          return false;
        }
      }

      for (property in b) {
        if (b.hasOwnProperty(property) && !a.hasOwnProperty(property)) {
          return false;
        }
      }

      return true;
    }

    __exports__["default"] = objectsAreEqual;
  });
})(this);
