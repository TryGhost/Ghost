define("ghost/views/mobile/parent-view", 
  ["ghost/utils/mobile","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var mobileQuery = __dependency1__["default"];

    // A mobile parent view needs to implement three methods,
    // showContent, showAll, and showMenu
    // Which are called by MobileIndex and MobileContent views
    var MobileParentView = Ember.View.extend({
        showContent: Ember.K,
        showMenu: Ember.K,
        showAll: Ember.K,

        setChangeLayout: function () {
            var self = this;
            this.set('changeLayout', function changeLayout() {
                if (mobileQuery.matches) {
                    // transitioned to mobile layout, so show content
                    self.showContent();
                } else {
                    // went from mobile to desktop
                    self.showAll();
                }
            });
        }.on('init'),

        attachChangeLayout: function () {
            mobileQuery.addListener(this.changeLayout);
        }.on('didInsertElement'),

        detachChangeLayout: function () {
            mobileQuery.removeListener(this.changeLayout);
        }.on('willDestroyElement')
    });

    __exports__["default"] = MobileParentView;
  });