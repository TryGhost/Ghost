const jwt = require('jsonwebtoken');
const should = require('should');
const {UnauthorizedError} = require('@tryghost/errors');
const members = require('../../../../../../core/server/services/auth/members');

describe('Auth Service - Members', function () {
    it('exports an authenticateMembersToken method', function () {
        const actual = typeof members.authenticateMembersToken;
        const expected = 'function';
        should.equal(actual, expected);
    });

    describe('authenticateMembersToken', function () {
        it('calls next without an error if there is no authorization header', function () {
            members.authenticateMembersToken({
                get() {
                    return null;
                }
            }, {}, function next(err) {
                const actual = err;
                const expected = undefined;

                should.equal(actual, expected);
            });
        });

        it('calls next without an error if the authorization header does not match the GhostMembers scheme', function () {
            members.authenticateMembersToken({
                get() {
                    return 'DodgyScheme credscredscreds';
                }
            }, {}, function next(err) {
                const actual = err;
                const expected = undefined;

                should.equal(actual, expected);
            });
        });
        describe('attempts to verify the credentials as a JWT, not allowing the "NONE" algorithm', function () {
            it('calls next with an UnauthorizedError if the verification fails', function () {
                members.authenticateMembersToken({
                    get() {
                        return 'GhostMembers notafuckentoken';
                    }
                }, {}, function next(err) {
                    const actual = err instanceof UnauthorizedError;
                    const expected = true;

                    should.equal(actual, expected);
                });
            });
            it('calls next with an error if the token is using the "none" algorithm', function () {
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
                members.authenticateMembersToken(req, {}, function next(err) {
                    const actual = err instanceof UnauthorizedError;
                    const expected = true;

                    should.equal(actual, expected);
                });
            });
        });
    });
});
