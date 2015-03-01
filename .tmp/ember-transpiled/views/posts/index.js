define("ghost/views/posts/index", 
  ["ghost/views/mobile/index-view","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var MobileIndexView = __dependency1__["default"];

    var PostsIndexView = MobileIndexView.extend({
        classNames: ['no-posts-box']
    });

    __exports__["default"] = PostsIndexView;
  });