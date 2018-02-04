var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    utils = require('../../../../server/models/base/utils'),
    testUtils = require('../../../utils');

describe('Models: Utils', function () {
    describe('actorIs', function () {
        it('returns false when user not defined', function () {
            should(Boolean(utils.actorIs(null, 'Author'))).be.false();
        });

        it('returns correctly when passed a single role', function () {
            var permissions = testUtils.permissions.author;

            should(utils.actorIs(permissions.user, 'Author')).be.true();
            should(utils.actorIs(permissions.user, 'Editor')).be.false();
        });

        it('returns correctly when passed multiple roles', function () {
            var permissions = testUtils.permissions.author;

            should(utils.actorIs(permissions.user, ['Author', 'Editor'])).be.true();
            should(utils.actorIs(permissions.user, ['Editor', 'Administrator'])).be.false();
        });
    });
});
