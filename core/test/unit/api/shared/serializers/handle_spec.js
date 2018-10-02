const should = require('should');
const Promise = require('bluebird');
const sinon = require('sinon');
const common = require('../../../../../server/lib/common');
const shared = require('../../../../../server/api/shared');
const sandbox = sinon.sandbox.create();

describe('Unit: api/shared/serializers/handle', function () {
    beforeEach(function () {
        sandbox.restore();
    });

    describe('input', function () {
        it('no api config passed', function () {
            return shared.serializers.handle.input()
                .then(Promise.reject)
                .catch((err) => {
                    (err instanceof common.errors.IncorrectUsageError).should.be.true();
                });
        });

        it('no api serializers passed', function () {
            return shared.serializers.handle.input({})
                .then(Promise.reject)
                .catch((err) => {
                    (err instanceof common.errors.IncorrectUsageError).should.be.true();
                });
        });

        it('ensure serializers are called', function () {
            const apiSerializers = {
                all: {
                    add: sandbox.stub().resolves()
                },
                posts: {
                    add: sandbox.stub().resolves()
                },
                options: {
                    all: sandbox.stub().resolves()
                }
            };

            return shared.serializers.handle.input({docName: 'posts', method: 'add'}, apiSerializers, {})
                .then(() => {
                    apiSerializers.all.add.calledOnce.should.be.true();
                    apiSerializers.options.all.calledOnce.should.be.true();
                    apiSerializers.posts.add.calledOnce.should.be.true();
                });
        });
    });

    describe('output', function () {
        it('no models passed', function () {
            return shared.serializers.handle.output(null, {}, {}, {});
        });

        it('no api config passed', function () {
            return shared.serializers.handle.output([])
                .then(Promise.reject)
                .catch((err) => {
                    (err instanceof common.errors.IncorrectUsageError).should.be.true();
                });
        });

        it('no api serializers passed', function () {
            return shared.serializers.handle.output([], {})
                .then(Promise.reject)
                .catch((err) => {
                    (err instanceof common.errors.IncorrectUsageError).should.be.true();
                });
        });

        it('ensure serializers are called', function () {
            const apiSerializers = {
                posts: {
                    add: sandbox.stub().resolves()
                },
                users: {
                    add: sandbox.stub().resolves()
                }
            };

            return shared.serializers.handle.output([], {docName: 'posts', method: 'add'}, apiSerializers, {})
                .then(() => {
                    apiSerializers.posts.add.calledOnce.should.be.true();
                    apiSerializers.users.add.called.should.be.false();
                });
        });
    });
});
