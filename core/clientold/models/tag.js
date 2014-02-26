/*global window, document, Ghost, $, _, Backbone */
(function () {
    'use strict';

    Ghost.Collections.Tags = Ghost.ProgressCollection.extend({
        url: Ghost.paths.apiRoot + '/tags/'
    });
}());
