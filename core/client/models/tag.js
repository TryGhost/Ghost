/*global window, document, Ghost, $, _, Backbone */
(function () {
    "use strict";

    Ghost.Collections.Tags = Backbone.Collection.extend({
        url: Ghost.settings.apiRoot + '/tags/'
    });
}());
