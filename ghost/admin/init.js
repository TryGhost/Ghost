/*globals window, $, _, Backbone */
(function () {
    "use strict";

    var Ghost = {
        Layout      : {},
        Views       : {},
        Collections : {},
        Models      : {},

        settings: {
            apiRoot: '/api/v0.1'
        },

        // This is a helper object to denote legacy things in the
        // middle of being transitioned.
        temporary: {},

        currentView: null,
        router: null
    };

    Ghost.init = function () {
        Ghost.router = new Ghost.Router();
        Backbone.history.start({
            pushState: true,
            hashChange: false,
            root: '/ghost'
        });
    };

    window.Ghost = Ghost;

}());