define("ghost/routes/settings/tags", 
  ["ghost/routes/authenticated","ghost/mixins/current-user-settings","ghost/mixins/pagination-route","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var CurrentUserSettings = __dependency2__["default"];
    var PaginationRouteMixin = __dependency3__["default"];

    var TagsRoute,
        paginationSettings;

    paginationSettings = {
        page: 1,
        include: 'post_count',
        limit: 15
    };

    TagsRoute = AuthenticatedRoute.extend(CurrentUserSettings, PaginationRouteMixin, {
        actions: {
            willTransition: function () {
                this.send('closeSettingsMenu');
            }
        },

        titleToken: 'Tags',

        beforeModel: function () {
            return this.currentUser()
                .then(this.transitionAuthor());
        },

        model: function () {
            this.store.unloadAll('tag');

            return this.store.filter('tag', paginationSettings, function (tag) {
                return !tag.get('isNew');
            });
        },

        setupController: function (controller, model) {
            this._super(controller, model);
            this.setupPagination(paginationSettings);
        },

        renderTemplate: function (controller, model) {
            this._super(controller, model);
            this.render('settings/tags/settings-menu', {
                into: 'application',
                outlet: 'settings-menu',
                view: 'settings/tags/settings-menu'
            });
        },

        deactivate: function () {
            this.controller.send('resetPagination');
        }
    });

    __exports__["default"] = TagsRoute;
  });