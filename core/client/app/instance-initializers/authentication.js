import Ember from 'ember';

var AuthenticationInitializer = {
    name: 'authentication',

    initialize: function (instance) {
        var store = instance.container.lookup('store:main'),
            Session = instance.container.lookup('simple-auth-session:main'),
            OAuth2 = instance.container.lookup('simple-auth-authenticator:oauth2-password-grant');

        Session.reopen({
            user: Ember.computed(function () {
                return store.find('user', 'me');
            })
        });

        OAuth2.reopen({
            makeRequest: function (url, data) {
                data.client_id = 'ghost-admin';
                return this._super(url, data);
            }
        });
    }
};

export default AuthenticationInitializer;
