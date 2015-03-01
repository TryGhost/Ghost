define("ghost/routes/mobile-index-route", 
  ["ghost/utils/mobile","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var mobileQuery = __dependency1__["default"];

    // Routes that extend MobileIndexRoute need to implement
    // desktopTransition, a function which is called when
    // the user resizes to desktop levels.
    var MobileIndexRoute = Ember.Route.extend({
        desktopTransition: Ember.K,

        activate: function attachDesktopTransition() {
            this._super();
            mobileQuery.addListener(this.desktopTransitionMQ);
        },

        deactivate: function removeDesktopTransition() {
            this._super();
            mobileQuery.removeListener(this.desktopTransitionMQ);
        },

        setDesktopTransitionMQ: function () {
            var self = this;
            this.set('desktopTransitionMQ', function desktopTransitionMQ() {
                if (!mobileQuery.matches) {
                    self.desktopTransition();
                }
            });
        }.on('init')
    });

    __exports__["default"] = MobileIndexRoute;
  });