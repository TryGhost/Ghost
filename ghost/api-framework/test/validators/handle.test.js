const errors = require('@tryghost/errors');
const assert = require('node:assert/strict');
const sinon = require('sinon');
const shared = require('../../');

describe('validators/handle', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('input', function () {
        it('no api config passed', function () {
            return shared.validators.handle.input()
                .then(Promise.reject)
                .catch((err) => {
                    assert.equal(err instanceof errors.IncorrectUsageError, true);
                });
        });

        it('no api validators passed', function () {
            return shared.validators.handle.input({})
                .then(Promise.reject)
                .catch((err) => {
                    assert.equal(err instanceof errors.IncorrectUsageError, true);
                });
        });

        it('no api config passed when validators exist', function () {
            return shared.validators.handle.input(undefined, {}, {})
                .then(Promise.reject)
                .catch((err) => {
                    assert.equal(err instanceof errors.IncorrectUsageError, true);
                });
        });

        it('ensure validators are called', function () {
            const getStub = sinon.stub();
            const addStub = sinon.stub();
            sinon.stub(shared.validators.input.all, 'all').get(() => {
                return getStub;
            });
            sinon.stub(shared.validators.input.all, 'add').get(() => {
                return addStub;
            });

            const apiValidators = {
                all: {
                    add: sinon.stub().resolves()
                },
                posts: {
                    add: sinon.stub().resolves()
                },
                users: {
                    add: sinon.stub().resolves()
                }
            };

            return shared.validators.handle.input({docName: 'posts', method: 'add'}, apiValidators, {context: {}})
                .then(() => {
                    assert.equal(getStub.calledOnce, true);
                    assert.equal(addStub.calledOnce, true);
                    assert.equal(apiValidators.all.add.calledOnce, true);
                    assert.equal(apiValidators.posts.add.calledOnce, true);
                    assert.equal(apiValidators.users.add.called, false);
                });
        });

        it('calls docName all validator when provided', function () {
            const apiValidators = {
                posts: {
                    all: sinon.stub().resolves()
                }
            };

            return shared.validators.handle.input({docName: 'posts', method: 'browse'}, apiValidators, {})
                .then(() => {
                    assert.equal(apiValidators.posts.all.calledOnce, true);
                });
        });
    });
});
