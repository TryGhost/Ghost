/*global window, document, Ghost, $, _, Backbone */
(function () {
    'use strict';

    Ghost.Models.Themes = Backbone.Model.extend({
        url: Ghost.paths.apiRoot + '/themes'
    });

}());
