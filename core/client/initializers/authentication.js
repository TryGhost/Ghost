var AuthenticationInitializer = {

    name: 'authentication',
    after: 'registerTrailingLocationHistory',

    initialize: function (container, application) {
        Ember.SimpleAuth.Session.reopen({
            user: function () {
                return container.lookup('store:main').find('user', 'me');
            }.property()
        });
        Ember.SimpleAuth.Authenticators.OAuth2.reopen({
            serverTokenEndpoint: '/ghost/api/v0.1/authentication/token',
            refreshAccessTokens: true,
            makeRequest: function (data) {
                data.client_id = 'ghost-admin';
                return this._super(data);
            }
        });
        Ember.SimpleAuth.setup(container, application, {
            authenticationRoute: 'signin',
            routeAfterAuthentication: 'content',
            authorizerFactory: 'ember-simple-auth-authorizer:oauth2-bearer'
        });
    }
};

export default AuthenticationInitializer;
