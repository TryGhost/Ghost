/*global window, document, Ghost, $, _, Backbone */
(function () {
    "use strict";

    // Set the url manually and id to '0' to force PUT requests
    Ghost.Models.Settings = Backbone.Model.extend({
        url: Ghost.settings.apiRoot + '/settings',
        id: "0",
        defaults: {
            title: 'My Blog',
            description: '',
            email: 'admin@tryghost.org'
        }
    });

}());