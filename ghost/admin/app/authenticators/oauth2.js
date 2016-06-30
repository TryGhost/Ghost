import computed from 'ember-computed';
import injectService from 'ember-service/inject';
import Authenticator from 'ember-simple-auth/authenticators/oauth2-password-grant';

export default Authenticator.extend({
    config: injectService(),
    ghostPaths: injectService(),

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
