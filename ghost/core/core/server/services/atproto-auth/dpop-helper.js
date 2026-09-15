/**
 * DPoP (Demonstration of Proof-of-Possession, RFC 9449) helpers.
 *
 * Each OAuth round-trip generates a fresh P-256 keypair. The private key is
 * serialised as JWK and stored in the DB during the flow; the public key is
 * embedded in every proof header so the AS can verify binding.
 */
const crypto = require('node:crypto');

/**
 * @typedef {Object} DPopKeyPair
 * @property {string} privateKeyJwk  - JSON-serialised private JWK (store this)
 * @property {crypto.KeyObject} privateKey
 * @property {Object} publicKeyJwk   - Public JWK to embed in proof headers
 */

/**
 * Generate a fresh P-256 DPoP keypair.
 * @returns {DPopKeyPair}
 */
function generateKeyPair() {
    const {privateKey} = crypto.generateKeyPairSync('ec', {namedCurve: 'P-256'});

    const privateKeyJwk = privateKey.export({format: 'jwk'});

    // Build public JWK by omitting the private key scalar
    const safePublicJwk = {...privateKeyJwk};
    delete safePublicJwk.d;

    return {
        privateKeyJwk: JSON.stringify(privateKeyJwk),
        privateKey,
        publicKeyJwk: safePublicJwk
    };
}

/**
 * Restore a keypair from a stored private JWK string.
 * @param {string} privateKeyJwkStr
 * @returns {DPopKeyPair}
 */
function restoreKeyPair(privateKeyJwkStr) {
    const privateKeyJwk = JSON.parse(privateKeyJwkStr);
    const privateKey = crypto.createPrivateKey({key: privateKeyJwk, format: 'jwk'});
    const publicKey = crypto.createPublicKey(privateKey);
    const publicKeyJwk = publicKey.export({format: 'jwk'});

    return {privateKeyJwk: privateKeyJwkStr, privateKey, publicKeyJwk};
}

/**
 * Build a DPoP proof JWT for a single HTTP request.
 *
 * @param {crypto.KeyObject} privateKey
 * @param {Object} publicKeyJwk
 * @param {string} htm  HTTP method in uppercase
 * @param {string} htu  HTTP target URI (no query/fragment)
 * @param {string} [nonce]  Server-issued nonce from a previous response
 * @returns {string} compact JWS
 */
function buildProof(privateKey, publicKeyJwk, htm, htu, nonce) {
    const header = {typ: 'dpop+jwt', alg: 'ES256', jwk: publicKeyJwk};
    const payload = {
        jti: crypto.randomUUID(),
        htm,
        htu: stripQueryAndFragment(htu),
        iat: Math.floor(Date.now() / 1000)
    };
    if (nonce) {
        payload.nonce = nonce;
    }

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signingInput = `${headerB64}.${payloadB64}`;

    const sig = crypto.sign(null, Buffer.from(signingInput), {key: privateKey, dsaEncoding: 'ieee-p1363'});
    return `${signingInput}.${sig.toString('base64url')}`;
}

/**
 * @param {string} url
 * @returns {string}
 */
function stripQueryAndFragment(url) {
    try {
        const u = new URL(url);
        u.search = '';
        u.hash = '';
        return u.toString();
    } catch {
        return url;
    }
}

module.exports = {generateKeyPair, restoreKeyPair, buildProof};
