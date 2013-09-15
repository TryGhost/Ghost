/*global window, document, Ghost, $, _, Backbone */
(function () {
    "use strict";
    //id:0 is used to issue PUT requests
    Ghost.Models.Settings = Backbone.Model.extend({
        url: Ghost.settings.apiRoot + '/settings/',
        id: "0"
    });

}());