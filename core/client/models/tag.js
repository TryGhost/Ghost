/*global window, document, Ghost, $, _, Backbone */
(function () {
    'use strict';

    Ghost.Collections.Tags = Ghost.TemplateModel.extend({
        url: Ghost.settings.apiRoot + '/tags/'
    });
}());
