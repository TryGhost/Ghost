/*global window, document, Ghost, $, Backbone, _ */
(function () {

  Ghost.Collections.User = Backbone.Collection.extend({
    model: Ghost.Models.User
  });

  Ghost.Models.User = Backbone.Model.extend({
    url: '/api/v0.1/posts/'
  });

}());