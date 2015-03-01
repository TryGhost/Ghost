define("ghost/routes/settings/index", 
  ["ghost/routes/mobile-index-route","ghost/mixins/current-user-settings","ghost/utils/mobile","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var MobileIndexRoute = __dependency1__["default"];
    var CurrentUserSettings = __dependency2__["default"];
    var mobileQuery = __dependency3__["default"];

    var SettingsIndexRoute = MobileIndexRoute.extend(SimpleAuth.AuthenticatedRouteMixin, CurrentUserSettings, {
        titleToken: 'Settings',

        // Redirect users without permission to view settings,
        // and show the settings.general route unless the user
        // is mobile
        beforeModel: function () {
            var self = this;
            return this.currentUser()
                .then(this.transitionAuthor())
                .then(this.transitionEditor())
                .then(function () {
                    if (!mobileQuery.matches) {
                        self.transitionTo('settings.general');
                    }
                });
        },

        desktopTransition: function () {
            this.transitionTo('settings.general');
        }
    });

    __exports__["default"] = SettingsIndexRoute;
  });