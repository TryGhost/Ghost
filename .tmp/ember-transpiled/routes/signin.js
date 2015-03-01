define("ghost/routes/signin", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var SigninRoute = Ember.Route.extend(styleBody, loadingIndicator, {
        titleToken: 'Sign In',

        classNames: ['ghost-login'],

        beforeModel: function () {
            if (this.get('session').isAuthenticated) {
                this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
            }
        },

        model: function () {
            return Ember.Object.create({
                identification: '',
                password: ''
            });
        },

        // the deactivate hook is called after a route has been exited.
        deactivate: function () {
            this._super();

            var controller = this.controllerFor('signin');

            // clear the properties that hold the credentials when we're no longer on the signin screen
            controller.set('model.identification', '');
            controller.set('model.password', '');
        }
    });

    __exports__["default"] = SigninRoute;
  });