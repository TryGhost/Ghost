import Ember from 'ember';
import Session from 'simple-auth/session';
import OAuth2 from 'simple-auth-oauth2/authenticators/oauth2';

var AuthenticationInitializer = {
    name: 'authentication',
    before: 'simple-auth',
    after: 'registerTrailingLocationHistory',

    initialize: function (container) {
        Session.reopen({
            user: Ember.computed(function () {
                return container.lookup('store:main').find('user', 'me');
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
