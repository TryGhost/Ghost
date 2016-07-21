import computed from 'ember-computed';
import injectService from 'ember-service/inject';
import Authenticator from 'ember-simple-auth/authenticators/oauth2-password-grant';
import run from 'ember-runloop';

export default Authenticator.extend({
    session: injectService(),
    config: injectService(),
    ghostPaths: injectService(),

    init() {
        this._super(...arguments);

        let handler = run.bind(this, () => {
            this.onOnline();
        });
        window.addEventListener('online', handler);
    },

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
    },

    /**
     * Invoked when "navigator.online" event is trigerred.
     * This is a helper function to handle intermittent internet connectivity. Token is refreshed
     * when browser status becomes "online".
     */
    onOnline() {
        if (this.get('session.isAuthenticated')) {
            let autoRefresh = this.get('refreshAccessTokens');
            if (autoRefresh) {
                let expiresIn = this.get('session.data.authenticated.expires_in');
                let token = this.get('session.data.authenticated.refresh_token');
                return this._refreshAccessToken(expiresIn, token);
            }
        }
    }
});
