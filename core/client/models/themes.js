/*global window, document, Ghost, $, _, Backbone */
(function () {
    'use strict';

    Ghost.Models.Themes = Backbone.Model.extend({
        url: Ghost.settings.apiRoot + '/themes'
    });

}());