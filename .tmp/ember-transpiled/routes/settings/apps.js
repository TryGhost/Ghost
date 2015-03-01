define("ghost/routes/settings/apps", 
  ["ghost/routes/authenticated","ghost/mixins/current-user-settings","ghost/mixins/style-body","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var CurrentUserSettings = __dependency2__["default"];
    var styleBody = __dependency3__["default"];

    var AppsRoute = AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
        titleToken: 'Apps',

        classNames: ['settings-view-apps'],

        beforeModel: function () {
            if (!this.get('config.apps')) {
                return this.transitionTo('settings.general');
            }

            return this.currentUser()
                .then(this.transitionAuthor())
                .then(this.transitionEditor());
        },

        model: function () {
            return this.store.find('app');
        }
    });

    __exports__["default"] = AppsRoute;
  });