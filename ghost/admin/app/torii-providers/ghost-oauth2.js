import Oauth2 from 'torii/providers/oauth2-code';
import computed from 'ember-computed';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import injectService from 'ember-service/inject';

let GhostOauth2 = Oauth2.extend({

    config: injectService(),

    name:    'ghost-oauth2',
    baseUrl: computed(function () {
        return `${this.get('config.ghostAuthUrl')}/oauth2/authorize/`;
    }),
    apiKey: computed(function () {
        return this.get('config.ghostAuthId');
    }),

    optionalUrlParams: ['type', 'email'],

    responseParams: ['code'],

    // we want to redirect to the ghost admin app by default
    init() {
        this._super(...arguments);
        let adminPath = ghostPaths().adminRoot;
        let redirectUri = `${window.location.protocol}//${window.location.host}`;

        redirectUri += adminPath;

        this.set('redirectUri', redirectUri);
    },

    open(options) {
        if (options.type) {
            this.set('type', options.type);
        }
        if (options.email) {
            this.set('email', options.email);
        }
        return this._super(...arguments);
    }
});

export default GhostOauth2;
