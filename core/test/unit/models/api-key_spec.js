const models = require('../../../server/models');
const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');

describe('Unit: models/api_key', function () {
    before(models.init);
    before(testUtils.teardown);
    before(testUtils.setup('roles'));

    describe('Add', function () {
        it('sets default secret', function () {
            // roles[5] = 'Admin Integration'
            const role_id = testUtils.DataGenerator.forKnex.roles[5].id;
            const attrs = {
                type: 'admin',
                role_id
            };

            return models.ApiKey.add(attrs).then((api_key) => {
                return models.ApiKey.findOne({id: api_key.id}, {withRelated: ['role']})
                    .then((api_key) => {
                        api_key.get('type').should.eql('admin');
                        api_key.related('role').get('id').should.eql(role_id);

                        // defaults
                        api_key.get('secret').length.should.eql(128);
                    });
            });
        });

        it('sets default secret for content key', function () {
            const attrs = {
                type: 'content'
            };

            return models.ApiKey.add(attrs).then((api_key) => {
                api_key.get('secret').length.should.eql(26);
            });
        });

        it('sets hardcoded role for key type', function () {
            // roles[5] = 'Admin Integration'
            const role_id = testUtils.DataGenerator.forKnex.roles[5].id;

            const adminKey = {
                type: 'admin'
            };
            const adminCheck = models.ApiKey.add(adminKey).then((api_key) => {
                return models.ApiKey.findOne({id: api_key.id}, {withRelated: ['role']})
                    .then((api_key) => {
                        api_key.get('type').should.eql('admin');

                        // defaults
                        should.exist(api_key.related('role').id);
                        api_key.related('role').get('id').should.eql(role_id);
                    });
            });

            const contentKey = {
                type: 'content',
                role_id: testUtils.DataGenerator.forKnex.roles[0].id
            };
            const contentCheck = models.ApiKey.add(contentKey).then((api_key) => {
                return models.ApiKey.findOne({id: api_key.id}, {withRelated: ['role']})
                    .then((api_key) => {
                        api_key.get('type').should.eql('content');

                        // defaults
                        should.not.exist(api_key.related('role').id);
                    });
            });

            return Promise.all([adminCheck, contentCheck]);
        });
    });

    describe('refreshSecret', function () {
        it('returns a call to edit passing a new secret', function () {
            const sandbox = sinon.sandbox.create();
            const editStub = sandbox.stub(models.ApiKey, 'edit').resolves();

            const fakeData = {
                id: 'TREVOR'
            };
            const fakeOptions = {};

            const result = models.ApiKey.refreshSecret(fakeData, fakeOptions);

            should.equal(result, editStub.returnValues[0]);
            should.equal(editStub.args[0][0].id, 'TREVOR');
            should.equal(editStub.args[0][0].secret.length, 128);
            should.equal(editStub.args[0][1], fakeOptions);

            sandbox.restore();
        });
    });
});
