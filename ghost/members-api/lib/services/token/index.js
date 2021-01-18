const jose = require('node-jose');
const jwt = require('jsonwebtoken');

module.exports = class TokenService {
    constructor({
        privateKey,
        publicKey,
        issuer
    }) {
        this._keyStore = jose.JWK.createKeyStore();
        this._keyStoreReady = this._keyStore.add(privateKey, 'pem');
        this._privateKey = privateKey;
        this._publicKey = publicKey;
        this._issuer = issuer;
    }

    encodeAPIToken({sub, aud = this._issuer, plans, exp}) {
        return this._keyStoreReady.then(jwk => jwt.sign({
            sub,
            plans,
            kid: jwk.kid
        }, this._privateKey, {
            algorithm: 'RS512',
            audience: aud,
            expiresIn: exp,
            issuer: this._issuer
        }));
    }

    encodeIdentityToken({sub}) {
        return this._keyStoreReady.then(jwk => jwt.sign({
            sub,
            kid: jwk.kid
        }, this._privateKey, {
            algorithm: 'RS512',
            audience: this._issuer,
            expiresIn: '10m',
            issuer: this._issuer
        }));
    }

    decodeToken(token) {
        return this._keyStoreReady.then(jwk => jwt.verify(token, this._publicKey, {
            algorithm: 'RS512',
            kid: jwk.kid,
            issuer: this._issuer
        })).then(() => jwt.decode(token));
    }

    getPublicKeys() {
        return this._keyStoreReady.then(() => {
            this._keyStore.toJSON();
        });
    }
};