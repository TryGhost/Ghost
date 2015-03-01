define("ghost/routes/error404", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var Error404Route = Ember.Route.extend({
        controllerName: 'error',
        templateName: 'error',
        titleToken: 'Error',

        model: function () {
            return {
                status: 404
            };
        }
    });

    __exports__["default"] = Error404Route;
  });