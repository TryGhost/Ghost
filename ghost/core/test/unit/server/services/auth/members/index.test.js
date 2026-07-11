const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const sinon = require('sinon');
const {UnauthorizedError} = require('@tryghost/errors');
const members = require('../../../../../../core/server/services/auth/members');
const membersService = require('../../../../../../core/server/services/members');

// A real RSA public key so the express-jwt middleware can be constructed.
// Token verification still fails as the tests expect.
const PUBLIC_KEY = '-----BEGIN RSA PUBLIC KEY-----\n' +
    'MIGJAoGBAJ5ruiuI2gWDGdj8mAUOk1GXEsxUhql+gxBMIkxaQf2kNigCr/wYXqrTJN2fn4BL\n' +
    'tMZqwKOA0ZbqaIRsEMFpDLyFLyFaqFpEpjpLLz/XUrIALzLlyz5Bbh0VjYm+dc7pSkQVpO0d\n' +
    'HugC1NJkn0P2L8U37bACg7/jX3ct6iqrDV0nAgMBAAE=\n' +
    '-----END RSA PUBLIC KEY-----\n';

// Calls the (async, callback-based) middleware and resolves once `next`
// fires, so the test waits for the assertions inside the callback.
function runMiddleware(req, assertNext) {
    return new Promise((resolve, reject) => {
        members.authenticateMembersToken(req, {}, function next(err) {
            try {
                assertNext(err);
            } catch (e) {
                return reject(e);
            }
            resolve();
        });
    });
}

describe('Auth Service - Members', function () {
    beforeEach(function () {
        // members.authenticateMembersToken reads membersService.api, which is
        // only populated once Ghost has booted — stub it for unit isolation.
        // `api` is a getter, so it must be stubbed rather than assigned.
        sinon.stub(membersService, 'api').get(() => ({
            getPublicConfig: async () => ({
                issuer: 'http://127.0.0.1:2369/members/api',
                publicKey: PUBLIC_KEY
            })
        }));
    });

    afterEach(function () {
        sinon.restore();
    });

    it('exports an authenticateMembersToken method', function () {
        assert.equal(typeof members.authenticateMembersToken, 'function');
    });

    describe('authenticateMembersToken', function () {
        it('calls next without an error if there is no authorization header', function () {
            return runMiddleware({get() {
                return null;
            }}, (err) => {
                assert.equal(err, undefined);
            });
        });

        it('calls next without an error if the authorization header does not match the GhostMembers scheme', function () {
            return runMiddleware({get() {
                return 'DodgyScheme credscredscreds';
            }}, (err) => {
                assert.equal(err, undefined);
            });
        });

        describe('attempts to verify the credentials as a JWT, not allowing the "NONE" algorithm', function () {
            it('calls next with an UnauthorizedError if the verification fails', function () {
                return runMiddleware({get() {
                    return 'GhostMembers notafuckentoken';
                }}, (err) => {
                    assert.equal(err instanceof UnauthorizedError, true);
                });
            });

            it('calls next with an error if the token is using the "none" algorithm', function () {
                const token = jwt.sign({rumpel: 'stiltskin'}, null, {algorithm: 'none'});
                return runMiddleware({get() {
                    return `GhostMembers ${token}`;
                }}, (err) => {
                    assert.equal(err instanceof UnauthorizedError, true);
                });
            });
        });
    });
});
