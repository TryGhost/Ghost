/*global window, document, Ghost, $, _, Backbone */
(function () {
    'use strict';
    //id:0 is used to issue PUT requests
    Ghost.Models.Settings = Ghost.ProgressModel.extend({
        url: Ghost.settings.apiRoot + '/settings/?type=blog,theme',
        id: '0',
        parse: function (resp) {
            resp.permalinks = resp.permalinks === "/:slug/" ? "" : "1";
            return resp;
        }
    });

}());
