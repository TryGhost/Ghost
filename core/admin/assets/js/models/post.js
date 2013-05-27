/*global window, document, Ghost, $, Backbone, _ */
(function () {

  Ghost.Collections.Posts = Backbone.Collection.extend({
    model: Ghost.Models.Post
  });

  Ghost.Models.Post = Backbone.Model.extend({
    url: '/api/v0.1/posts/',
    defaults: {
      status: 'draft'
    }
  });

}());