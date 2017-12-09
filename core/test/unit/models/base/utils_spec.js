var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    utils = require('../../../../server/models/base/utils');

describe('Models: Utils', function () {
    describe('actorIs', function () {
        it('returns false when user not defined', function () {
            should(Boolean(utils.actorIs(null, 'Author'))).be.false();
        });

        it('returns correctly when passed a single role', function () {
            const user = {roles: [{name: 'Author'}]};

            should(utils.actorIs(user, 'Author')).be.true();
            should(utils.actorIs(user, 'Editor')).be.false();
        });

        it('returns correctly when passed multiple roles', function () {
            const user = {roles: [{name: 'Author'}]};

            should(utils.actorIs(user, ['Author', 'Editor'])).be.true();
            should(utils.actorIs(user, ['Editor', 'Administrator'])).be.false();
        });
    });
});
