const errors = require('@tryghost/errors');
const should = require('should');
const Promise = require('bluebird');
const sinon = require('sinon');
const shared = require('../../../../../core/server/api/shared');

describe('Unit: api/shared/serializers/handle', function () {
    beforeEach(function () {
        sinon.restore();
    });

    describe('input', function () {
        it('no api config passed', function () {
            return shared.serializers.handle.input()
                .then(Promise.reject)
                .catch((err) => {
                    (err instanceof errors.IncorrectUsageError).should.be.true();
                });
        });

        it('no api serializers passed', function () {
            return shared.serializers.handle.input({})
                .then(Promise.reject)
                .catch((err) => {
                    (err instanceof errors.IncorrectUsageError).should.be.true();
                });
        });

        it('ensure serializers are called with apiConfig and frame', function () {
            const allStub = sinon.stub();
            sinon.stub(shared.serializers.input.all, 'all').get(() => allStub);

            const apiSerializers = {
                all: sinon.stub().resolves(),
                posts: {
                    all: sinon.stub().resolves(),
                    browse: sinon.stub().resolves()
                }
            };

            const apiConfig = {docName: 'posts', method: 'browse'};
            const frame = {};

            const stubsToCheck = [
                allStub,
                apiSerializers.all,
                apiSerializers.posts.all,
                apiSerializers.posts.browse
            ];

            return shared.serializers.handle.input(apiConfig, apiSerializers, frame)
                .then(() => {
                    stubsToCheck.forEach((stub) => {
                        stub.calledOnce.should.be.true();
                        should.equal(stub.args[0][0], apiConfig);
                        should.equal(stub.args[0][1], frame);
                    });
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
                    (err instanceof errors.IncorrectUsageError).should.be.true();
                });
        });

        it('no api serializers passed', function () {
            return shared.serializers.handle.output([], {})
                .then(Promise.reject)
                .catch((err) => {
                    (err instanceof errors.IncorrectUsageError).should.be.true();
                });
        });

        it('ensure serializers are called', function () {
            const apiSerializers = {
                posts: {
                    add: sinon.stub().resolves()
                },
                users: {
                    add: sinon.stub().resolves()
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
