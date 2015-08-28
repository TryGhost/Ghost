import GhostOauth2Authenticator from 'ghost/authenticators/oauth2';

export default {
    name: 'ghost-authentictor',

    initialize: function (container) {
        container.register(
            'ghost-authenticator:oauth2-password-grant',
            GhostOauth2Authenticator
        );
    }
};
