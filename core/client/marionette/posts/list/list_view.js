this.App.module("PostsApp.List", function(List, App, Backbone, Marionette, $, _){
  List.Layout = Marionette.Layout.extend({
    template: "blogs_layout",
    tagName: 'section',
    className: '.content-view-container',
    regions: {
      'postsRegion': '.content-list-content',
      'postRegion': '.content-preview'
    }
  });

  List.Post = Marionette.ItemView.extend({
    tagName: 'li',
    template: "list-item",
    modelEvents: {
      "change:chosen" : "chosen"
    },
    events: {
      "click" : "choose"
    },
    choose: function(e){
      e.preventDefault();
      this.model.choose();
    },
    chosen: function(model, value, options){
      this.$el.toggleClass("active", value);
    }
  });

  List.Posts = Marionette.CollectionView.extend({
    tagName: 'ol',
    itemView: List.Post
  });
});