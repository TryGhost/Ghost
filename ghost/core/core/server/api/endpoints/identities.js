const logging = require('@tryghost/logging');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'identities',
    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        async query(frame) {
            const IdentityTokenService = require('../../services/identity-tokens');

            let role = null;
            try {
                await frame.user.load(['roles']);
                role = frame.user.relations.roles.toJSON()[0].name;
            } catch (err) {
                logging.warn('Could not load role for identity');
            }

            const token = await IdentityTokenService.instance.getTokenForUser(frame.user.get('email'), role);

            return {token};
        }
    }
};

module.exports = controller;
