/*global Ghost,Backbone */
(function () {
    'use strict';

    Ghost.Models.User = Ghost.ProgressModel.extend({
        url: Ghost.paths.apiRoot + '/users/me/',

        parse: function (resp) {
            // unwrap user from {users: [{...}]}
            if (resp.users) {
                resp = resp.users[0];
            }

            return resp;
        },

        sync: function (method, model, options) {
            // wrap user in {users: [{...}]}
            if (method === 'create' || method === 'update') {
                options.data = JSON.stringify({users: [this.attributes]});
                options.contentType = 'application/json';
            }

            return Backbone.Model.prototype.sync.apply(this, arguments);
        }
    });

//    Ghost.Collections.Users = Backbone.Collection.extend({
//        url: Ghost.paths.apiRoot + '/users/'
//    });

}());