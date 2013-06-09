/*global window, document, Ghost, $, Backbone, _ */
(function () {
    "use strict";

    // Set the url manually and id to '0' to force PUT requests
    Ghost.Models.Settings = Backbone.Model.extend({
        url: '/api/v0.1/settings/',
        id: "0",
        defaults: {
            title: 'My Blog',
            description: '',
            email: 'admin@tryghost.org'
        }
    });

}());
