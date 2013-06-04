/*global window, document, Ghost, Backbone, $, _ */
(function () {

    "use strict";

    Ghost.router = new Ghost.Router();

    $(function () {

        Backbone.history.start({pushState: true, hashChange: false, root: '/ghost'});

    });


}());