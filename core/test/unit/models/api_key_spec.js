const models = require('../../../server/models');
const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');

const sandbox = sinon.sandbox.create();

describe('Unit: models/api_key', function () {
    before(models.init);
    before(testUtils.teardown);
    before(testUtils.setup('roles'));

    afterEach(function () {
       sandbox.restore();
    });

    describe('Add', function () {
        it('sets default secret', function () {
            let role_id = testUtils.DataGenerator.forKnex.roles[0].id;
            let attrs = {
                type: 'admin',
                role_id
            };

            return models.ApiKey.add(attrs).then((api_key) => {
                return models.ApiKey.where({id: api_key.id}).fetch({withRelated: ['role']})
                    .then((api_key) => {
                        api_key.get('type').should.eql('admin');
                        api_key.related('role').get('id').should.eql(role_id);

                        // defaults
                        api_key.get('secret').length.should.eql(128);
                    });
            });
        });
    });
});
