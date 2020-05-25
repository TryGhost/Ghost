const errors = require('@tryghost/errors');
const Promise = require('bluebird');
const sinon = require('sinon');
const shared = require('../../../../../core/server/api/shared');

describe('Unit: api/shared/validators/handle', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('input', function () {
        it('no api config passed', function () {
            return shared.validators.handle.input()
                .then(Promise.reject)
                .catch((err) => {
                    (err instanceof errors.IncorrectUsageError).should.be.true();
                });
        });

        it('no api validators passed', function () {
            return shared.validators.handle.input({})
                .then(Promise.reject)
                .catch((err) => {
                    (err instanceof errors.IncorrectUsageError).should.be.true();
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
                    getStub.calledOnce.should.be.true();
                    addStub.calledOnce.should.be.true();
                    apiValidators.all.add.calledOnce.should.be.true();
                    apiValidators.posts.add.calledOnce.should.be.true();
                    apiValidators.users.add.called.should.be.false();
                });
        });
    });
});
