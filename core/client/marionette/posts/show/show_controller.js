this.App.module("PostsApp.Show", function(Show, App, Backbone, Marionette, $, _){
  Show.Controller = Marionette.Controller.extend({
    initialize: function(options){
      this.layout = this.getPostLayout(options.post);

      this.listenTo(this.layout, "settings:clicked", function(){
        this.layout.toggleSettings(this.getSettingsView(options.post));
      });

      options.region.show(this.layout);
    },

    getSettingsView: function(post) {
      return new Show.Settings({model: post});
    },

    getPostLayout: function(post){
      return new Show.Layout({model: post});
    }
  });
});