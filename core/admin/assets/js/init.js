/*globals window, Backbone */
(function ($) {
    "use strict";

    var Ghost = {
        Layout     : {},
        View       : {},
        Collection : {},
        Model      : {},

        settings: {
            baseUrl: '/api/v0.1'
        },

        currentView: null
    };

    window.Ghost = Ghost;

}());