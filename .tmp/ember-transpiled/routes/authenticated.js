define("ghost/routes/authenticated", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var AuthenticatedRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin);

    __exports__["default"] = AuthenticatedRoute;
  });