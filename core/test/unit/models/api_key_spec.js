const models = require('../../../server/models');
const testUtils = require('../../utils');

describe('Unit: models/api_key', function () {
    before(models.init);
    before(testUtils.teardown);
    before(testUtils.setup('roles'));

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

        it('sets hardcoded role for key type', function () {
            let role_id = testUtils.DataGenerator.forKnex.roles[0].id;

            let adminKey = {
                type: 'admin'
            };
            let adminCheck = models.ApiKey.add(adminKey).then((api_key) => {
                return models.ApiKey.where({id: api_key.id}).fetch({withRelated: ['role']})
                    .then((api_key) => {
                        api_key.get('type').should.eql('admin');

                        // defaults
                        api_key.related('role').should.exist;
                        api_key.related('role').get('id').should.eql(role_id);
                    });
            });

            let contentKey = {
                type: 'content',
                role_id: testUtils.DataGenerator.forKnex.roles[0].id
            };
            let contentCheck = models.ApiKey.add(contentKey).then((api_key) => {
                return models.ApiKey.where({id: api_key.id}).fetch({withRelated: ['role']})
                    .then((api_key) => {
                        api_key.get('type').should.eql('content');

                        // defaults
                        api_key.related('role').should.not.exist;
                    });
            });

            return Promise.all([adminCheck, contentCheck]);
        });
    });
});
