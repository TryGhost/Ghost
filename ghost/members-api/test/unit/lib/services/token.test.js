const assert = require('assert');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const TokenService = require('../../../../lib/services/TokenService');

describe('TokenService', function () {
    let tokenService;

    before(function () {
        const privateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIICWwIBAAKBgQCea7oriNoFgxnY/JgFDpNRlxLMVIapfoMQTCJMWkH9pDYoAq/8GF6q0yTd\nn5+AS7TGasCjgNGW6miEbBDBaQy8hS8hWqhaRKY6Sy8/11KyAC8y5cs+QW4dFY2JvnXO6UpE\nFaTtHR7oAtTSZJ9D9i/FN+2wAoO/4193Leoqqw1dJwIDAQABAoGAeqejo5M4Yi4n9AVV2gx3\n6SLTrhn/jPljllmr8HutPilGuOGjycZAfXguwdyVjKqQ01LRxYW2QGdK9sQIkQa5kXjzTtLa\ndtHYcplk0rTTsdjbvZ31AKNTNYn5s+PhGGb0Gc9n8co18K75ol8VPG8lpXjUUCWsb2xcV7wA\nQuHkOukCQQD7TluL8I4tHXzREIW3OZeLTyRlPEIn5cDdPPEIHrAIu4WJ50zAbkMH7W4HBmWf\ntafxSgWcRsdMIZn//wZV3goLAkEAoWE6/LgKgowSouIjbRdekw7QPZMvN2LUV0a0GZHpSA2K\nzzyvOsW1dU9EO+WhCpdfoikuxWiPtN+byAe2sbBG1QJALuKgm8wmim488jhV6ig5iMkcLjL+\n2Li5sc0D3xLynr51nJPlsuUfZmQ6qd7cqN5YVeEMiOp/lkmSlLs8sFp7nwJAKEkFWKD4vq4I\n2PBqt4jl6v//q99aIhFhwIe93cQ23+3BgQo9FAbWzXoEJo+kK+itzuVI766ycQyA7uY+DQ1c\nIQJAER3D4lsY5wnE+01eqk8NfF7TO+u4ezWs/rmNyn3hapskgV0xqn+FanXeVJ5K7B3AzabR\na4/tLo88gWEfcow6WQ==\n-----END RSA PRIVATE KEY-----\n';
        const publicKey = '-----BEGIN RSA PUBLIC KEY-----\nMIGJAoGBAJ5ruiuI2gWDGdj8mAUOk1GXEsxUhql+gxBMIkxaQf2kNigCr/wYXqrTJN2fn4BL\ntMZqwKOA0ZbqaIRsEMFpDLyFLyFaqFpEpjpLLz/XUrIALzLlyz5Bbh0VjYm+dc7pSkQVpO0d\nHugC1NJkn0P2L8U37bACg7/jX3ct6iqrDV0nAgMBAAE=\n-----END RSA PUBLIC KEY-----\n';
        const issuer = 'http://127.0.0.1:2369/members/api';

        tokenService = new TokenService({
            privateKey,
            publicKey,
            issuer
        });
    });

    describe('encodeIdentityToken', function () {
        it('can encode a token and decode it afterwards', async function () {
            const token = await tokenService.encodeIdentityToken({sub: 'member@example.com'});
            const decodedToken = await tokenService.decodeToken(token);

            assert.deepEqual(Object.keys(decodedToken), ['sub', 'kid', 'iat', 'exp', 'aud', 'iss']);
            assert.equal(decodedToken.aud, 'http://127.0.0.1:2369/members/api');
            assert.equal(decodedToken.iss, 'http://127.0.0.1:2369/members/api');
            assert.equal(decodedToken.sub, 'member@example.com');
        });
    });

    describe('getPublicKeys', function () {
        it('can verify the token using public keys', async function () {
            const token = await tokenService.encodeIdentityToken({sub: 'member@example.com'});
            const jwks = await tokenService.getPublicKeys();
            const publicKey = jwkToPem(jwks.keys[0]);

            const decodedToken = jwt.verify(token, publicKey, {
                algorithms: ['RS512'],
                issuer: this._issuer
            });

            assert.deepEqual(Object.keys(decodedToken), ['sub', 'kid', 'iat', 'exp', 'aud', 'iss']);
            assert.equal(decodedToken.aud, 'http://127.0.0.1:2369/members/api');
            assert.equal(decodedToken.iss, 'http://127.0.0.1:2369/members/api');
            assert.equal(decodedToken.sub, 'member@example.com');
        });
    });
});
