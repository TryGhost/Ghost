import Ember from 'ember';

export default {
    name: 'oauth-prefilter',
    after: 'ember-simple-auth',

    initialize: function (application) {
        var session = application.container.lookup('service:session');

        Ember.$.ajaxPrefilter(function (options) {
            session.authorize('authorizer:oauth2', function (headerName, headerValue) {
                var headerObject = {};

                headerObject[headerName] = headerValue;
                options.headers = Ember.merge(options.headers || {}, headerObject);
            });
        });
    }
};
