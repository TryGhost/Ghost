import GhostOauth2Authenticator from 'ghost/authenticators/oauth2';

export default {
    name: 'ghost-authentictor',

    initialize: function (registry, application) {
        application.register(
            'ghost-authenticator:oauth2-password-grant',
            GhostOauth2Authenticator
        );
    }
};
