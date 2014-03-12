/*global window, document, Ghost, $, _, Backbone */
(function () {
    'use strict';

    Ghost.Models.User = Backbone.Model.extend({
        url: Ghost.settings.apiRoot + '/users/me/'
    });

//    Ghost.Collections.Users = Backbone.Collection.extend({
//        url: Ghost.settings.apiRoot + '/users/'
//    });

}());
