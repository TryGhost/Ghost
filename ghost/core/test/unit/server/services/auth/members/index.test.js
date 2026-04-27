const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const sinon = require('sinon');
const {UnauthorizedError} = require('@tryghost/errors');
const membersService = require('../../../../../../core/server/services/members');
const members = require('../../../../../../core/server/services/auth/members');

describe('Auth Service - Members', function () {
    beforeAll(function () {
        sinon.stub(membersService, 'api').get(function () {
            return {
                getPublicConfig: sinon.stub().resolves({
                    issuer: 'test-issuer',
                    publicKey: 'test-public-key'
                })
            };
        });
    });

    afterAll(function () {
        sinon.restore();
    });

    function authenticateMembersToken(req) {
        return new Promise((resolve, reject) => {
            const result = members.authenticateMembersToken(req, {}, function next(err) {
                resolve(err);
            });

            Promise.resolve(result).catch(reject);
        });
    }

    it('exports an authenticateMembersToken method', function () {
        const actual = typeof members.authenticateMembersToken;
        const expected = 'function';
        assert.equal(actual, expected);
    });

    describe('authenticateMembersToken', function () {
        it('calls next without an error if there is no authorization header', async function () {
            const err = await authenticateMembersToken({
                get() {
                    return null;
                }
            });

            assert.equal(err, undefined);
        });

        it('calls next without an error if the authorization header does not match the GhostMembers scheme', async function () {
            const err = await authenticateMembersToken({
                get() {
                    return 'DodgyScheme credscredscreds';
                }
            });

            assert.equal(err, undefined);
        });
        describe('attempts to verify the credentials as a JWT, not allowing the "NONE" algorithm', function () {
            it('calls next with an UnauthorizedError if the verification fails', async function () {
                const err = await authenticateMembersToken({
                    get() {
                        return 'GhostMembers notafuckentoken';
                    }
                });

                assert.equal(err instanceof UnauthorizedError, true);
            });
            it('calls next with an error if the token is using the "none" algorithm', async function () {
                const claims = {
                    rumpel: 'stiltskin'
                };
                const token = jwt.sign(claims, null, {
                    algorithm: 'none'
                });
                const req = {
                    get() {
                        return `GhostMembers ${token}`;
                    }
                };
                const err = await authenticateMembersToken(req);

                assert.equal(err instanceof UnauthorizedError, true);
            });
        });
    });
});
