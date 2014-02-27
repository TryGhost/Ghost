/*global Ghost */
(function () {
    'use strict';

    Ghost.Collections.Tags = Ghost.ProgressCollection.extend({
        url: Ghost.paths.apiRoot + '/tags/'
    });
}());
