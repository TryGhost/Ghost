/*global window, document, Ghost, $, _, Backbone */
(function () {
    "use strict";

    Ghost.Models.Settings = Backbone.Model.extend({
        url: Ghost.settings.apiRoot + '/settings'
    });

}());