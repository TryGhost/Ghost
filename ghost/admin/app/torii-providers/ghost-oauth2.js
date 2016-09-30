import Oauth2 from 'torii/providers/oauth2-code';
import injectService from 'ember-service/inject';
import computed from 'ember-computed';

let GhostOauth2 = Oauth2.extend({

    config: injectService(),

    name:    'ghost-oauth2',
    baseUrl: 'http://devauth.ghost.org:8080/oauth2/authorize',
    apiKey: computed(function () {
        return this.get('config.ghostAuthId');
    }),

    optionalUrlParams: ['type', 'email'],

    responseParams: ['code'],

    // we want to redirect to the ghost admin app by default
    redirectUri: window.location.href.replace(/(\/ghost)(.*)/, '$1/'),

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
