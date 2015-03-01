define("ghost/routes/debug", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var DebugRoute = Ember.Route.extend({
        beforeModel: function () {
            this.transitionTo('settings.labs');
        }
    });

    __exports__["default"] = DebugRoute;
  });