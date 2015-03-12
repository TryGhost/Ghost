import Ember from 'ember';
import ghostPaths from 'ghost/utils/ghost-paths';

var Ghost,
    AuthenticationInitializer;

Ghost = ghostPaths();

AuthenticationInitializer = {
    name: 'authentication',
    before: 'simple-auth',
    after: 'registerTrailingLocationHistory',

    initialize: function (container) {
        window.ENV = window.ENV || {};

        window.ENV['simple-auth'] = {
            authenticationRoute: 'signin',
            routeAfterAuthentication: 'posts',
            authorizer: 'simple-auth-authorizer:oauth2-bearer',
            localStorageKey: 'ghost' + (Ghost.subdir.indexOf('/') === 0 ? '-' + Ghost.subdir.substr(1) : '') + ':session'
        };

        window.ENV['simple-auth-oauth2'] = {
            serverTokenEndpoint: Ghost.apiRoot + '/authentication/token',
            serverTokenRevocationEndpoint: Ghost.apiRoot + '/authentication/revoke',
            refreshAccessTokens: true
        };

        SimpleAuth.Session.reopen({
            user: Ember.computed(function () {
                return container.lookup('store:main').find('user', 'me');
            })
        });

        SimpleAuth.Authenticators.OAuth2.reopen({
            makeRequest: function (url, data) {
                data.client_id = 'ghost-admin';
                return this._super(url, data);
            }
        });
    }
};

export default AuthenticationInitializer;
