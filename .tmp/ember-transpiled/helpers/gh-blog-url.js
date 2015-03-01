define("ghost/helpers/gh-blog-url", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var blogUrl = Ember.Handlebars.makeBoundHelper(function () {
        return new Ember.Handlebars.SafeString(this.get('config.blogUrl'));
    });

    __exports__["default"] = blogUrl;
  });