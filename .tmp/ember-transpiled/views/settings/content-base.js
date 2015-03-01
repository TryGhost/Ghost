define("ghost/views/settings/content-base", 
  ["ghost/views/mobile/content-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var MobileContentView = __dependency1__["default"];
    /**
     * All settings views other than the index should inherit from this base class.
     * It ensures that the correct screen is showing when a mobile user navigates
     * to a `settings.someRouteThatIsntIndex` route.
     */

    var SettingsContentBaseView = MobileContentView.extend({
        tagName: 'section',
        classNames: ['settings-content', 'js-settings-content', 'fade-in']
    });

    __exports__["default"] = SettingsContentBaseView;
  });