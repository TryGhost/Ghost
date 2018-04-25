'use strict';

const should = require('should'),
    sinon = require('sinon'),
    common = require('../../../server/lib/common'),
    models = require('../../../server/models'),
    settingsCache = require('../../../server/services/settings/cache'),
    testUtils = require('../../utils'),
    sandbox = sinon.sandbox.create();

describe('Unit: models/invite', function () {
    before(function () {
        models.init();
        sandbox.stub(settingsCache, 'get').withArgs('db_hash').returns('12345678');
    });

    after(function () {
        sandbox.restore();
    });

    describe('add', function () {
        let knexMock;

        before(function () {
            knexMock = new testUtils.mocks.knex();
            knexMock.mock();
        });

        after(function () {
            knexMock.unmock();
        });

        it('default', function () {
            return models.Invite.add({email: 'invited@test.org', role_id: testUtils.DataGenerator.forKnex.roles[1].id})
                .then(function (invite) {
                    invite.get('status').should.eql('pending');
                    invite.get('email').should.eql('invited@test.org');
                    should.exist(invite.get('token'));
                    should.exist(invite.get('expires'));
                });
        });

        it('set status with none internal context', function () {
            return models.Invite.add({
                email: 'invited@test.org',
                role_id: testUtils.DataGenerator.forKnex.roles[1].id,
                status: 'sent'
            }).then(function (invite) {
                invite.get('status').should.eql('pending');
                invite.get('email').should.eql('invited@test.org');
                should.exist(invite.get('token'));
                should.exist(invite.get('expires'));
            });
        });

        it('set status with internal context', function () {
            return models.Invite.add({
                email: 'invited@test.org',
                role_id: testUtils.DataGenerator.forKnex.roles[1].id,
                status: 'sent'
            }, testUtils.context.internal).then(function (invite) {
                invite.get('status').should.eql('sent');
                invite.get('email').should.eql('invited@test.org');
                should.exist(invite.get('token'));
                should.exist(invite.get('expires'));
            });
        });

        it('[error] no role passed', function () {
            return models.Invite.add({email: 'invited@test.org'})
                .then(function () {
                    'Should fail'.should.be.true();
                })
                .catch(function (err) {
                    (err[0] instanceof common.errors.ValidationError).should.be.true();
                });
        });
    });
});
