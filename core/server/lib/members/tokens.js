const jose = require('node-jose');
const jwt = require('jsonwebtoken');

module.exports = function ({
    privateKey,
    publicKey
}) {
    const keyStore = jose.JWK.createKeyStore();
    const keyStoreReady = keyStore.add(privateKey, 'pem');

    function encodeToken({sub, aud, iss}) {
        return keyStoreReady.then(jwk => jwt.sign({
            sub,
            kid: jwk.kid
        }, privateKey, {
            algorithm: 'RS512',
            audience: aud,
            issuer: iss
        }));
    }

    function decodeToken(token, {iss}) {
        return keyStoreReady.then(jwk => jwt.verify(token, publicKey, {
            algorithm: 'RS512',
            kid: jwk.kid,
            issuer: iss
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
