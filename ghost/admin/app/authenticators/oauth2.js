import Authenticator from 'ember-simple-auth/authenticators/oauth2-password-grant';
import RSVP from 'rsvp';
import {assign} from '@ember/polyfills';
import {computed} from '@ember/object';
import {isEmpty} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {makeArray as wrap} from '@ember/array';

export default Authenticator.extend({
    ajax: service(),
    session: service(),
    config: service(),
    ghostPaths: service(),

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
        /* eslint-disable camelcase */
        data.client_id = this.get('config.clientId');
        data.client_secret = this.get('config.clientSecret');
        /* eslint-enable camelcase */

        let options = {
            data,
            dataType: 'json',
            contentType: 'application/x-www-form-urlencoded'
        };

        return this.get('ajax').post(url, options);
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
    },

    authenticate(identification, password, scope = [], headers = {}) {
        return new RSVP.Promise((resolve, reject) => {
            let data = {grant_type: 'password', username: identification, password};
            let serverTokenEndpoint = this.get('serverTokenEndpoint');
            let scopesString = wrap(scope).join(' ');
            if (!isEmpty(scopesString)) {
                data.scope = scopesString;
            }
            this.makeRequest(serverTokenEndpoint, data, headers).then((response) => {
                run(() => {
                    /* eslint-disable camelcase */
                    let expiresAt = this._absolutizeExpirationTime(response.expires_in);
                    this._scheduleAccessTokenRefresh(response.expires_in, expiresAt, response.refresh_token);
                    /* eslint-enable camelcase */

                    if (!isEmpty(expiresAt)) {
                        response = assign(response, {expires_at: expiresAt});
                    }

                    resolve(response);
                });
            }, (error) => {
                reject(error);
            });
        });
    }
});
