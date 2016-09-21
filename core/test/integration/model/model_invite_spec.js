var testUtils = require('../../utils'),
    should = require('should'),
    models = require('../../../server/models');

describe('Invite Model', function () {
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    describe('add invite', function () {
        beforeEach(testUtils.setup());

        it('create invite', function (done) {
            models.Invite.add({
                email: 'test@test.de'
            }, testUtils.context.internal)
                .then(function (invite) {
                    should.exist(invite);
                    should.exist(invite.get('token'));
                    should.exist(invite.get('expires'));
                    should.exist(invite.get('email'));
                    done();
                })
                .catch(done);
        });
    });
});
