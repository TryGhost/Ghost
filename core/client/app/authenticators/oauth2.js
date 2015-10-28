import Ember from 'ember';
import Authenticator from 'ember-simple-auth/authenticators/oauth2-password-grant';

const {computed, inject} = Ember;

export default Authenticator.extend({
    config: inject.service(),
    ghostPaths: inject.service('ghost-paths'),

    serverTokenEndpoint: computed('ghostPaths.apiRoot', function () {
        return `${this.get('ghostPaths.apiRoot')}/authentication/token`;
    }),

    serverTokenRevocationEndpoint: computed('ghostPaths.apiRoot', function () {
        return `${this.get('ghostPaths.apiRoot')}/authentication/revoke`;
    }),

    makeRequest(url, data) {
        /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
        data.client_id = this.get('config.clientId');
        data.client_secret = this.get('config.clientSecret');
        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
        return this._super(url, data);
    }
});
