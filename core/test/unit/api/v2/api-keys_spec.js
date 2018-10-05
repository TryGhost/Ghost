const should = require('should');
const sinon = require('sinon');
const models = require('../../../../server/models');
const api_keys = require('../../../../server/api/v2/api-keys');

describe('api_keys resource controllers', function () {
    before(models.init);

    it('has a docName of api_keys', function () {
        should.equal(api_keys.docName, 'api_keys');
    });

    describe('add', function () {
        it('should enforce permissions', function () {
            const add = api_keys.add;
            should.equal(add.permissions, true);
        });

        describe('data', function () {
            it('should have integration_id data', function () {
                const data = api_keys.add.data;
                should.equal(data.includes('integration_id'), true);
            });

            it('should have type data', function () {
                const data = api_keys.add.data;
                should.equal(data.includes('type'), true);
            });
        });

        describe('validation', function () {
            it('should require the integration_id', function () {
                const validation = api_keys.add.validation;
                should.equal(validation.data.integration_id.required, true);
            });

            it('should require the type', function () {
                const validation = api_keys.add.validation;
                should.equal(validation.data.type.required, true);
            });

            it('should only allow type to be "content" or "admin"', function () {
                const validation = api_keys.add.validation;
                should.equal(validation.data.type.allowed.includes("content"), true);
                should.equal(validation.data.type.allowed.includes("admin"), true);

                // have to check because ONLY these values
                should.equal(validation.data.type.allowed.length, 2);
            });
        });

        describe('query', function () {
            it('returns the result of ApiKeyModel.add(frame.data, frame.options)', function () {
                const sandbox = sinon.sandbox.create();
                const query = api_keys.add.query;

                const addStub = sandbox.stub(models.ApiKey, 'add').resolves();
                const fakeFrame = {
                    data: {},
                    options: {}
                };

                const result = query(fakeFrame);

                should.equal(result, addStub.returnValues[0]);
                should.equal(addStub.args[0][0], fakeFrame.data);
                should.equal(addStub.args[0][1], fakeFrame.options);

                sandbox.restore();
            });
        });
    });
});
