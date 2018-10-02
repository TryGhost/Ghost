const should = require('should');
const Promise = require('bluebird');
const sinon = require('sinon');
const common = require('../../../../../server/lib/common');
const shared = require('../../../../../server/api/shared');
const sandbox = sinon.sandbox.create();

describe('Unit: api/shared/validators/handle', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('input', function () {
        it('no api config passed', function () {
            return shared.validators.handle.input()
                .then(Promise.reject)
                .catch((err) => {
                    (err instanceof common.errors.IncorrectUsageError).should.be.true();
                });
        });

        it('no api validators passed', function () {
            return shared.validators.handle.input({})
                .then(Promise.reject)
                .catch((err) => {
                    (err instanceof common.errors.IncorrectUsageError).should.be.true();
                });
        });

        it('ensure validators are called', function () {
            sandbox.stub(shared.validators.input.options, 'all').resolves();

            const apiValidators = {
                all: {
                    add: sandbox.stub().resolves()
                },
                posts: {
                    add: sandbox.stub().resolves()
                },
                options: {
                    all: sandbox.stub().resolves()
                },
                users: {
                    add: sandbox.stub().resolves()
                }
            };

            return shared.validators.handle.input({docName: 'posts', method: 'add'}, apiValidators, {context: {}})
                .then(() => {
                    shared.validators.input.options.all.calledOnce.should.be.true();
                    apiValidators.all.add.calledOnce.should.be.true();
                    apiValidators.posts.add.calledOnce.should.be.true();
                    apiValidators.users.add.called.should.be.false();
                    apiValidators.options.all.calledOnce.should.be.true();
                });
        });
    });
});
