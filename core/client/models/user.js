/*global window, document, Ghost, $, _, Backbone */
(function () {
    'use strict';

    Ghost.Models.User = Ghost.ProgressModel.extend({
        url: Ghost.paths.apiRoot + '/users/me/'
    });

//    Ghost.Collections.Users = Backbone.Collection.extend({
//        url: Ghost.paths.apiRoot + '/users/'
//    });

}());
