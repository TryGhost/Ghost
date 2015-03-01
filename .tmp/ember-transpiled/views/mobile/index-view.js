define("ghost/views/mobile/index-view", 
  ["ghost/utils/mobile","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var mobileQuery = __dependency1__["default"];

    var MobileIndexView = Ember.View.extend({
        // Ensure that going to the index brings the menu into view on mobile.
        showMenu: function () {
            if (mobileQuery.matches) {
                this.get('parentView').showMenu();
            }
        }.on('didInsertElement')
    });

    __exports__["default"] = MobileIndexView;
  });