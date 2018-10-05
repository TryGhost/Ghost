const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const models = require('../../../../server/models');
const {NotFoundError} = require('../../../../server/lib/common/errors');
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

    describe('destroy', function () {
        it('should enforce permissions', function () {
            const destroy = api_keys.destroy;
            should.equal(destroy.permissions, true);
        });

        it('should have statusCode afo 204', function () {
            const destroy = api_keys.destroy;
            should.equal(destroy.statusCode, 204);
        });
        it('should have responseType of plain', function () {
            const destroy = api_keys.destroy;
            should.equal(destroy.responseType, 'plain');
        });

        describe('data', function () {
            it('should have id data', function () {
                const data = api_keys.destroy.data;
                should.equal(data.includes('id'), true);
            });
        });

        describe('validation', function () {
            it('should require the id', function () {
                const validation = api_keys.destroy.validation;
                should.equal(validation.data.id.required, true);
            });
        });

        describe('query', function () {
            it('returns the result of ApiKeyModel.destroy() called with frame.options and data.id', function () {
                const sandbox = sinon.sandbox.create();
                const query = api_keys.destroy.query;

                const destroyPromise = Promise.resolve();

                const destroyStub = sandbox.stub(models.ApiKey, 'destroy')
                    .returns(destroyPromise);

                const destroyPromiseCatchStub = sandbox.stub(destroyPromise, 'catch').resolves();

                const fakeFrame = {
                    data: {id: 123},
                    options: {base: 'cannon'}
                };

                const result = query(fakeFrame);

                should.equal(result, destroyPromiseCatchStub.returnValues[0]);
                should.equal(destroyStub.args[0][0].id, 123);
                should.equal(destroyStub.args[0][0].base, 'cannon');

                should.equal(destroyPromiseCatchStub.args[0][0], models.ApiKey.NotFoundError);
                try {
                    destroyPromiseCatchStub.args[0][1]();
                } catch (err) {
                    should.equal(err instanceof NotFoundError, true);
                }

                sandbox.restore();
            });
        });
    });

    describe('edit', function () {
        it('should enforce permissions', function () {
            const edit = api_keys.edit;
            should.equal(edit.permissions, true);
        });

        describe('data', function () {
            it('should have id data', function () {
                const data = api_keys.edit.data;
                should.equal(data.includes('id'), true);
            });
        });

        describe('validation', function () {
            it('should require the id', function () {
                const validation = api_keys.edit.validation;
                should.equal(validation.data.id.required, true);
            });
        });

        describe('query', function () {
            it('returns the result of ApiKeyModel.refreshSecret setting options.id and require: true and handles NotFoundError', function () {
                const sandbox = sinon.sandbox.create();
                const query = api_keys.edit.query;

                const refreshSecretPromise = Promise.resolve();

                const refreshSecretStub = sandbox.stub(models.ApiKey, 'refreshSecret')
                    .returns(refreshSecretPromise);

                const refreshSecretCatchStub = sandbox.stub(refreshSecretPromise, 'catch').resolves();

                const fakeFrame = {
                    data: {id: 123},
                    options: {andre: '3000andWOT'}
                };

                const result = query(fakeFrame);

                should.equal(result, refreshSecretCatchStub.returnValues[0]);
                should.equal(refreshSecretStub.args[0][0], fakeFrame.data);
                should.deepEqual(refreshSecretStub.args[0][1], {
                    require: true,
                    andre: '3000andWOT',
                    id: 123
                });

                should.equal(refreshSecretCatchStub.args[0][0], models.ApiKey.NotFoundError);

                try {
                    refreshSecretCatchStub.args[0][1]();
                } catch (err) {
                    should.equal(err instanceof NotFoundError, true);
                }

                sandbox.restore();
            });
        });
    });
});
