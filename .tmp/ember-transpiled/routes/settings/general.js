define("ghost/routes/settings/general", 
  ["ghost/routes/authenticated","ghost/mixins/loading-indicator","ghost/mixins/current-user-settings","ghost/mixins/style-body","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];
    var CurrentUserSettings = __dependency3__["default"];
    var styleBody = __dependency4__["default"];

    var SettingsGeneralRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, CurrentUserSettings, {
        titleToken: 'General',

        classNames: ['settings-view-general'],

        beforeModel: function () {
            return this.currentUser()
                .then(this.transitionAuthor())
                .then(this.transitionEditor());
        },

        model: function () {
            return this.store.find('setting', {type: 'blog,theme'}).then(function (records) {
                return records.get('firstObject');
            });
        },

        actions: {
            save: function () {
                this.get('controller').send('save');
            }
        }
    });

    __exports__["default"] = SettingsGeneralRoute;
  });