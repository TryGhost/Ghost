/*global window, document, Ghost, $, _, Backbone */
(function () {
    'use strict';

    Ghost.Models.Themes = Ghost.TemplateModel.extend({
        url: Ghost.settings.apiRoot + '/themes'
    });

}());