define("ghost/views/settings/tags", 
  ["ghost/views/settings/content-base","ghost/mixins/pagination-view-infinite-scroll","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var BaseView = __dependency1__["default"];
    var PaginationScrollMixin = __dependency2__["default"];

    var SettingsTagsView = BaseView.extend(PaginationScrollMixin);

    __exports__["default"] = SettingsTagsView;
  });