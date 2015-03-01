define("ghost/adapters/user", 
  ["ghost/adapters/application","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ApplicationAdapter = __dependency1__["default"];

    var UserAdapter = ApplicationAdapter.extend({
        find: function (store, type, id) {
            return this.findQuery(store, type, {id: id, status: 'all'});
        }
    });

    __exports__["default"] = UserAdapter;
  });