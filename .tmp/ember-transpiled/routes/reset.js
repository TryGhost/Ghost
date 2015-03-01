define("ghost/routes/reset", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var ResetRoute = Ember.Route.extend(styleBody, loadingIndicator, {
        classNames: ['ghost-reset'],

        beforeModel: function () {
            if (this.get('session').isAuthenticated) {
                this.notifications.showWarn('You can\'t reset your password while you\'re signed in.', {delayed: true});
                this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
            }
        },

        setupController: function (controller, params) {
            controller.token = params.token;
        },

        // Clear out any sensitive information
        deactivate: function () {
            this._super();
            this.controller.clearData();
        }
    });

    __exports__["default"] = ResetRoute;
  });