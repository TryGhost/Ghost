import Ember from 'ember';
import Authenticator from 'ember-simple-auth/authenticators/oauth2-password-grant';

export default Authenticator.extend({
    config: Ember.inject.service(),
    ghostPaths: Ember.inject.service('ghost-paths'),

    serverTokenEndpoint: Ember.computed('ghostPaths.apiRoot', function () {
        return this.get('ghostPaths.apiRoot') + '/authentication/token';
    }),

    serverTokenRevocationEndpoint: Ember.computed('ghostPaths.apiRoot', function () {
        return this.get('ghostPaths.apiRoot') + '/authentication/revoke';
    }),

    makeRequest: function (url, data) {
        data.client_id = this.get('config.clientId');
        data.client_secret = this.get('config.clientSecret');
        return this._super(url, data);
    }
});
