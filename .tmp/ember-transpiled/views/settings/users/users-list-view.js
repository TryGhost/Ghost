define("ghost/views/settings/users/users-list-view", 
  ["ghost/mixins/pagination-view-infinite-scroll","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var PaginationViewMixin = __dependency1__["default"];

    var UsersListView = Ember.View.extend(PaginationViewMixin, {
        classNames: ['js-users-list-view']
    });

    __exports__["default"] = UsersListView;
  });