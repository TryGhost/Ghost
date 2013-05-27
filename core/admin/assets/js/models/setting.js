/*global window, document, Ghost, $, Backbone, _ */
(function () {

  Ghost.Collections.Settings = Backbone.Collection.extend({
    model: Ghost.Models.Post
  });

  Ghost.Models.Setting = Backbone.Model.extend({
    url: '/api/v0.1/settings/'
  });

}());