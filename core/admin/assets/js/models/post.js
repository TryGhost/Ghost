/*global window, document, Ghost, $, Backbone, _ */
(function () {
    "use strict";

    Ghost.Model.Post = Backbone.Model.extend({
        urlRoot: '/api/v0.1/posts/',
        defaults: {
            status: 'draft'
        }
    });

    Ghost.Collection.Posts = Backbone.Collection.extend({
        url: Ghost.settings.baseURL + '/posts',
        model: Ghost.Model.Post
    });

}());