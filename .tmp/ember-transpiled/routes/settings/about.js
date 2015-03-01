define("ghost/routes/settings/about", 
  ["ghost/routes/authenticated","ghost/mixins/loading-indicator","ghost/mixins/style-body","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var loadingIndicator = __dependency2__["default"];
    var styleBody = __dependency3__["default"];

    var SettingsAboutRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, {
        titleToken: 'About',

        classNames: ['settings-view-about'],

        cachedConfig: false,
        model: function () {
            var cachedConfig = this.get('cachedConfig'),
                self = this;
            if (cachedConfig) {
                return cachedConfig;
            }

            return ic.ajax.request(this.get('ghostPaths.url').api('configuration'))
                .then(function (configurationResponse) {
                    var configKeyValues = configurationResponse.configuration;
                    cachedConfig = {};
                    configKeyValues.forEach(function (configKeyValue) {
                        cachedConfig[configKeyValue.key] = configKeyValue.value;
                    });
                    self.set('cachedConfig', cachedConfig);
                    return cachedConfig;
                });
        }
    });

    __exports__["default"] = SettingsAboutRoute;
  });