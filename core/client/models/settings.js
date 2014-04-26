/*global Ghost */
(function () {
    'use strict';
    //id:0 is used to issue PUT requests
    Ghost.Models.Settings = Ghost.ProgressModel.extend({
        url: Ghost.paths.apiRoot + '/settings/?type=blog,theme,app',
        id: '0'
    });

}());
