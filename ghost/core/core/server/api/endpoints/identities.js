const logging = require('@tryghost/logging');
const settings = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');
const jwt = require('jsonwebtoken');
const jose = require('node-jose');
const issuer = urlUtils.urlFor('admin', true);

const dangerousPrivateKey = settings.get('ghost_private_key');
const keyStore = jose.JWK.createKeyStore();
const keyStoreReady = keyStore.add(dangerousPrivateKey, 'pem');

const getKeyID = async () => {
    const key = await keyStoreReady;
    return key.kid;
};

const sign = async (claims, options = {}) => {
    const kid = await getKeyID();
    return jwt.sign(claims, dangerousPrivateKey, Object.assign({
        issuer,
        expiresIn: '5m',
        algorithm: 'RS256',
        keyid: kid
    }, options));
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'identities',
    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        async query(frame) {
            let role = null;
            try {
                await frame.user.load(['roles']);
                role = frame.user.relations.roles.toJSON()[0].name;
            } catch (err) {
                logging.warn('Could not load role for identity');
            }
            const claims = {
                sub: frame.user.get('email')
            };
            if (typeof role === 'string') {
                claims.role = role;
            }
            const token = await sign(claims);
            return {token};
        }
    }
};

module.exports = controller;
