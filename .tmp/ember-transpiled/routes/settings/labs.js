define("ghost/routes/settings/labs", 
  ["ghost/routes/authenticated","ghost/mixins/style-body","ghost/mixins/current-user-settings","ghost/mixins/loading-indicator","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var AuthenticatedRoute = __dependency1__["default"];
    var styleBody = __dependency2__["default"];
    var CurrentUserSettings = __dependency3__["default"];
    var loadingIndicator = __dependency4__["default"];

    var LabsRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, CurrentUserSettings, {
        titleToken: 'Labs',

        classNames: ['settings'],
        beforeModel: function () {
            return this.currentUser()
                .then(this.transitionAuthor())
                .then(this.transitionEditor());
        },

        model: function () {
            return this.store.find('setting', {type: 'blog,theme'}).then(function (records) {
                return records.get('firstObject');
            });
        }
    });

    __exports__["default"] = LabsRoute;
  });