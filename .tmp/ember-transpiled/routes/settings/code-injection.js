define("ghost/routes/settings/code-injection", 
  ["ghost/routes/authenticated","ghost/mixins/loading-indicator","ghost/mixins/current-user-settings","ghost/mixins/style-body","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];
    var CurrentUserSettings = __dependency3__["default"];
    var styleBody = __dependency4__["default"];

    var SettingsCodeInjectionRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, CurrentUserSettings, {
        classNames: ['settings-view-code'],

        beforeModel: function () {
            var feature = this.controllerFor('feature'),
                self = this;

            if (!feature) {
                this.generateController('feature');
                feature = this.controllerFor('feature');
            }

            return this.currentUser()
                .then(this.transitionAuthor())
                .then(this.transitionEditor())
                .then(function () {
                    return feature.then(function () {
                        if (!feature.get('codeInjectionUI')) {
                            return self.transitionTo('settings.general');
                        }
                    });
                });
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

    __exports__["default"] = SettingsCodeInjectionRoute;
  });