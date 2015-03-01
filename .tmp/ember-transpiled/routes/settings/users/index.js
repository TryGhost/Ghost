define("ghost/routes/settings/users/index", 
  ["ghost/routes/authenticated","ghost/mixins/pagination-route","ghost/mixins/style-body","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var PaginationRouteMixin = __dependency2__["default"];
    var styleBody = __dependency3__["default"];

    var paginationSettings,
        UsersIndexRoute;

    paginationSettings = {
        page: 1,
        limit: 20,
        status: 'active'
    };

    UsersIndexRoute = AuthenticatedRoute.extend(styleBody, PaginationRouteMixin, {
        titleToken: 'Users',

        classNames: ['settings-view-users'],

        setupController: function (controller, model) {
            this._super(controller, model);
            this.setupPagination(paginationSettings);
        },

        model: function () {
            var self = this;

            return self.store.find('user', {limit: 'all', status: 'invited'}).then(function () {
                return self.store.find('user', 'me').then(function (currentUser) {
                    if (currentUser.get('isEditor')) {
                        // Editors only see authors in the list
                        paginationSettings.role = 'Author';
                    }

                    return self.store.filter('user', paginationSettings, function (user) {
                        if (currentUser.get('isEditor')) {
                            return user.get('isAuthor') || user === currentUser;
                        }
                        return true;
                    });
                });
            });
        },

        actions: {
            reload: function () {
                this.refresh();
            }
        }
    });

    __exports__["default"] = UsersIndexRoute;
  });