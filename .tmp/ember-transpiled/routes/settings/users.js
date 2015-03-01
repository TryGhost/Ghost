define("ghost/routes/settings/users", 
  ["ghost/routes/authenticated","ghost/mixins/current-user-settings","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var CurrentUserSettings = __dependency2__["default"];

    var UsersRoute = AuthenticatedRoute.extend(CurrentUserSettings, {
        beforeModel: function () {
            return this.currentUser()
                .then(this.transitionAuthor());
        }
    });

    __exports__["default"] = UsersRoute;
  });