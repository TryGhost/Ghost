define("ghost/views/posts", 
  ["ghost/views/mobile/parent-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var MobileParentView = __dependency1__["default"];

    var PostsView = MobileParentView.extend({
        classNames: ['content-view-container'],
        tagName: 'section',

        // Mobile parent view callbacks
        showMenu: function () {
            $('.js-content-list, .js-content-preview').addClass('show-menu').removeClass('show-content');
        },
        showContent: function () {
            $('.js-content-list, .js-content-preview').addClass('show-content').removeClass('show-menu');
        },
        showAll: function () {
            $('.js-content-list, .js-content-preview').removeClass('show-menu show-content');
        }
    });

    __exports__["default"] = PostsView;
  });