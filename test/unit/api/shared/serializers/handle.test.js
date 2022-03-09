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

        it('ensure default serializers are called with apiConfig and frame', function () {
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
                        sinon.assert.calledOnceWithExactly(stub, apiConfig, frame);
                    });
                });
        });

        it('ensure serializers are called with apiConfig and frame if new shared serializer is added', function () {
            const allStub = sinon.stub();
            const allBrowseStub = sinon.stub();

            shared.serializers.input.all.browse = allBrowseStub;

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
                allBrowseStub,
                apiSerializers.all,
                apiSerializers.posts.all,
                apiSerializers.posts.browse
            ];

            return shared.serializers.handle.input(apiConfig, apiSerializers, frame)
                .then(() => {
                    stubsToCheck.forEach((stub) => {
                        sinon.assert.calledOnceWithExactly(stub, apiConfig, frame);
                    });

                    sinon.assert.callOrder(allStub, allBrowseStub, apiSerializers.all, apiSerializers.posts.all, apiSerializers.posts.browse);
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

        it('ensure custom api Serializers are called correctly', function () {
            const apiSerializers = {
                posts: {
                    add: sinon.stub().resolves()
                },
                users: {
                    add: sinon.stub().resolves()
                }
            };

            const response = [];
            const apiConfig = {docName: 'posts', method: 'add'};
            const frame = {};

            return shared.serializers.handle.output(response, apiConfig, apiSerializers, frame)
                .then(() => {
                    sinon.assert.calledOnceWithExactly(apiSerializers.posts.add, response, apiConfig, frame);
                    sinon.assert.notCalled(apiSerializers.users.add);
                });
        });

        it('ensure "all" serializers are called correctly', function () {
            const apiSerializers = {
                all: {
                    after: sinon.stub().resolves(),
                    before: sinon.stub().resolves()

                },
                posts: {
                    add: sinon.stub().resolves(),
                    all: sinon.stub().resolves()
                }
            };

            const response = [];
            const apiConfig = {docName: 'posts', method: 'add'};
            const frame = {};

            const stubsToCheck = [
                apiSerializers.all.before,
                apiSerializers.posts.add,
                apiSerializers.posts.all
            ];

            return shared.serializers.handle.output(response, apiConfig, apiSerializers, frame)
                .then(() => {
                    stubsToCheck.forEach((stub) => {
                        sinon.assert.calledOnceWithExactly(stub, response, apiConfig, frame);
                    });

                    // After has a different call signature... is this a intentional?
                    sinon.assert.calledOnceWithExactly(apiSerializers.all.after, apiConfig, frame);

                    sinon.assert.callOrder(apiSerializers.all.before, apiSerializers.posts.all, apiSerializers.posts.add, apiSerializers.all.after);
                });
        });
    });
});
