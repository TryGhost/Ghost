const should = require('should'),
    sinon = require('sinon'),
    models = require('../../../server/models'),
    testUtils = require('../../utils'),
    configUtils = require('../../utils/configUtils'),
    sandbox = sinon.sandbox.create();

describe('Unit: models/permission', function () {
    before(function () {
        models.init();
    });

    after(function () {
        sandbox.restore();
        configUtils.restore();
    });

    before(testUtils.teardown);

    describe('add', function () {
        beforeEach(testUtils.setup('roles'));
        afterEach(testUtils.teardown);

        it('without roles', function () {
            return models.Permission.add({name: 'test', object_type: 'something', action_type: 'read something'})
                .then(function (permission) {
                    permission.get('name').should.eql('test');
                    permission.get('object_type').should.eql('something');
                    permission.get('action_type').should.eql('read something');
                });
        });

        it('with roles', function () {
            return models.Permission.add({
                name: 'test',
                object_type: 'something',
                action_type: 'write something',
                roles: [testUtils.DataGenerator.forKnex.roles[1]]
            }).then(function (permission) {
                permission.get('name').should.eql('test');
                permission.get('object_type').should.eql('something');
                permission.get('action_type').should.eql('write something');
                permission.related('roles').models[0].id.should.eql(testUtils.DataGenerator.forKnex.roles[1].id);
            });
        });

        it('[error] validation', function () {
            return models.Permission.add({})
                .then(function () {
                    'Should fail'.should.be.true();
                })
                .catch(function (err) {
                    err.length.should.eql(3);
                });
        });
    });
});
