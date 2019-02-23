const jose = require('node-jose');
const jwt = require('jsonwebtoken');

module.exports = function ({
    privateKey,
    publicKey,
    issuer
}) {
    const keyStore = jose.JWK.createKeyStore();
    const keyStoreReady = keyStore.add(privateKey, 'pem');

    function encodeToken({sub, aud = issuer, plans}) {
        return keyStoreReady.then(jwk => jwt.sign({
            sub,
            plans,
            kid: jwk.kid
        }, privateKey, {
            algorithm: 'RS512',
            audience: aud,
            expiresIn: '30m',
            issuer
        }));
    }

    function decodeToken(token) {
        return keyStoreReady.then(jwk => jwt.verify(token, publicKey, {
            algorithm: 'RS512',
            kid: jwk.kid,
            issuer
        })).then(() => jwt.decode(token));
    }

    function getPublicKeys() {
        return keyStoreReady.then(() => {
            keyStore.toJSON();
        });
    }

    return {
        encodeToken,
        decodeToken,
        getPublicKeys
    };
};
