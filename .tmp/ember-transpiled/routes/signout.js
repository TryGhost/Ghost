define("ghost/routes/signout", 
  ["ghost/routes/authenticated","ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var styleBody = __dependency2__["default"];
    var loadingIndicator = __dependency3__["default"];

    var SignoutRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, {
        titleToken: 'Sign Out',

        classNames: ['ghost-signout'],

        afterModel: function (model, transition) {
            this.notifications.clear();
            if (Ember.canInvoke(transition, 'send')) {
                transition.send('invalidateSession');
                transition.abort();
            } else {
                this.send('invalidateSession');
            }
        }
    });

    __exports__["default"] = SignoutRoute;
  });