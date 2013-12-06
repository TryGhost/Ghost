/*global window, document, Ghost, $, _, Backbone */
(function () {
    'use strict';
    //id:0 is used to issue PUT requests
    Ghost.Models.Settings = Ghost.ProgressModel.extend({
        url: Ghost.paths.apiRoot + '/settings/?type=blog,theme',
        id: '0'
    });

}());
