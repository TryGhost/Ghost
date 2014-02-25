this.App.module("PostsApp", function(PostsApp, App, Backbone, Marionette, $, _){

  PostsApp.Router = Marionette.AppRouter.extend({
    appRoutes: {
      "posts"         : "list",
      "posts/:slug"   : "show"
    }
  })

  var API = {
    list: function(options) {
      options = options || {};
      new PostsApp.List.Controller({
        region: App.mainRegion,
        slug: options.slug
      });
    },

    show: function(post, region) {
      if (!region) {
        return API.list({slug: post})
      }

      new PostsApp.Show.Controller({
        region: region,
        post: post
      });
    }
  }

  App.commands.setHandler("show:post", function(post, region){
    App.navigate("/posts/" + post.get("slug"))
    return API.show(post, region);
  });

  App.addInitializer(function(){
    return new PostsApp.Router({
      controller: API
    })
  });
});