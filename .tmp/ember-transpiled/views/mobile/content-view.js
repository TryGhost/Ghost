define("ghost/views/mobile/content-view", 
  ["ghost/utils/mobile","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var mobileQuery = __dependency1__["default"];

    var MobileContentView = Ember.View.extend({
        // Ensure that loading this view brings it into view on mobile
        showContent: function () {
            if (mobileQuery.matches) {
                this.get('parentView').showContent();
            }
        }.on('didInsertElement')
    });

    __exports__["default"] = MobileContentView;
  });