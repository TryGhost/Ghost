define("ghost/routes/settings", 
  ["ghost/routes/authenticated","ghost/mixins/style-body","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var styleBody = __dependency2__["default"];
    var loadingIndicator = __dependency3__["default"];

    var SettingsRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, {
        titleToken: 'Settings',

        classNames: ['settings']
    });

    __exports__["default"] = SettingsRoute;
  });