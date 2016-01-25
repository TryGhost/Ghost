import Ember from 'ember';

const {merge} = Ember;

export default {
    name: 'jquery-ajax-oauth-prefilter',
    after: 'ember-simple-auth',

    initialize(application) {
        let session = application.lookup('service:session');

        Ember.$.ajaxPrefilter(function (options) {
            session.authorize('authorizer:oauth2', function (headerName, headerValue) {
                let headerObject = {};

                headerObject[headerName] = headerValue;
                options.headers = merge(options.headers || {}, headerObject);
            });
        });
    }
};
