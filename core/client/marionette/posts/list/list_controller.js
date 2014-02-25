this.App.module("PostsApp.List", function(List, App, Backbone, Marionette, $, _){
  List.Controller = Marionette.Controller.extend({
    initialize: function(options){
      var posts = App.request("post:entities", options.slug);

      this.layout = this.getLayoutView();

      this.listenTo(this.layout, "show", function(){
        this.postsRegion(posts);
      });

      this.listenTo(posts, "change:chosen", function(post){
        App.execute("show:post", post, this.layout.postRegion)
      });

      options.region.show(this.layout);
    },

    postsRegion: function(posts){
      var postsView = this.getPostsView(posts);
      this.layout.postsRegion.show(postsView);
    },

    getPostsView: function(posts){
      return new List.Posts({
        collection: posts
      });
    },

    getLayoutView: function(){
      return new List.Layout;
    }
  });
});