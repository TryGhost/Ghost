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

    async encodeIdentityToken({sub}) {
        const jwk = await this._keyStoreReady;
        return jwt.sign({
            sub,
            kid: jwk.kid
        }, this._privateKey, {
            keyid: jwk.kid,
            algorithm: 'RS512',
            audience: this._issuer,
            expiresIn: '10m',
            issuer: this._issuer
        });
    }

    /**
     * @param {string} token
     * @returns {Promise<jwt.JwtPayload>}
     */
    async decodeToken(token) {
        await this._keyStoreReady;

        const result = jwt.verify(token, this._publicKey, {
            algorithms: ['RS512'],
            issuer: this._issuer
        });

        if (typeof result === 'string') {
            return {sub: result};
        }

        return result;
    }

    async getPublicKeys() {
        await this._keyStoreReady;
        return this._keyStore.toJSON();
    }
};
