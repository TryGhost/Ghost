define("ghost/routes/setup", 
  ["ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var styleBody = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];

    var SetupRoute = Ember.Route.extend(styleBody, loadingIndicator, {
        titleToken: 'Setup',

        classNames: ['ghost-setup'],

        // use the beforeModel hook to check to see whether or not setup has been
        // previously completed.  If it has, stop the transition into the setup page.

        beforeModel: function () {
            var self = this;

            // If user is logged in, setup has already been completed.
            if (this.get('session').isAuthenticated) {
                this.transitionTo(SimpleAuth.Configuration.routeAfterAuthentication);
                return;
            }

            // If user is not logged in, check the state of the setup process via the API
            return ic.ajax.request(this.get('ghostPaths.url').api('authentication/setup'), {
                type: 'GET'
            }).then(function (result) {
                var setup = result.setup[0].status;

                if (setup) {
                    return self.transitionTo('signin');
                }
            });
        }
    });

    __exports__["default"] = SetupRoute;
  });