const errors = require('@tryghost/errors');
const sinon = require('sinon');
const shared = require('../../');

describe('serializers/handle', function () {
    afterEach(function () {
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
        let apiSerializers,
            response,
            apiConfig,
            frame;

        beforeEach(function () {
            response = [];
            apiConfig = {docName: 'posts', method: 'add'};
            frame = {};
        });

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

        describe('Specific serializers only', function () {
            beforeEach(function () {
                apiSerializers = {
                    posts: {
                        add: sinon.stub().resolves()
                    },
                    users: {
                        add: sinon.stub().resolves()
                    }
                };
            });

            it('correct custom serializer is called', function () {
                return shared.serializers.handle.output(response, apiConfig, apiSerializers, frame)
                    .then(() => {
                        sinon.assert.calledOnceWithExactly(apiSerializers.posts.add, response, apiConfig, frame);
                        sinon.assert.notCalled(apiSerializers.users.add);
                    });
            });

            it('no serializer called if there is no match', function () {
                apiConfig = {docName: 'posts', method: 'idontexist'};

                return shared.serializers.handle.output(response, apiConfig, apiSerializers, frame)
                    .then(() => {
                        sinon.assert.notCalled(apiSerializers.posts.add);
                        sinon.assert.notCalled(apiSerializers.users.add);
                    });
            });
        });

        describe('Custom and global (all) serializers', function () {
            beforeEach(function () {
                apiSerializers = {
                    all: {
                        after: sinon.stub().resolves(),
                        before: sinon.stub().resolves()

                    },
                    posts: {
                        add: sinon.stub().resolves(),
                        all: sinon.stub().resolves()
                    }
                };
            });

            it('calls custom serializer if one exists', function () {
                const stubsToCheck = [
                    apiSerializers.all.before,
                    apiSerializers.posts.add
                ];

                return shared.serializers.handle.output(response, apiConfig, apiSerializers, frame)
                    .then(() => {
                        stubsToCheck.forEach((stub) => {
                            sinon.assert.calledOnceWithExactly(stub, response, apiConfig, frame);
                        });

                        // After has a different call signature... is this a intentional?
                        sinon.assert.calledOnceWithExactly(apiSerializers.all.after, apiConfig, frame);

                        sinon.assert.callOrder(apiSerializers.all.before, apiSerializers.posts.add, apiSerializers.all.after);

                        sinon.assert.notCalled(apiSerializers.posts.all);
                    });
            });

            it('calls all serializer if custom one does not exist', function () {
                apiConfig = {docName: 'posts', method: 'idontexist'};

                const stubsToCheck = [
                    apiSerializers.all.before,
                    apiSerializers.posts.all
                ];

                return shared.serializers.handle.output(response, apiConfig, apiSerializers, frame)
                    .then(() => {
                        stubsToCheck.forEach((stub) => {
                            sinon.assert.calledOnceWithExactly(stub, response, apiConfig, frame);
                        });

                        // After has a different call signature... is this a intentional?
                        sinon.assert.calledOnceWithExactly(apiSerializers.all.after, apiConfig, frame);

                        sinon.assert.callOrder(apiSerializers.all.before, apiSerializers.posts.all, apiSerializers.all.after);

                        sinon.assert.notCalled(apiSerializers.posts.add);
                    });
            });
        });

        describe('Custom, default and global (all) serializers with no custom fallback', function () {
            beforeEach(function () {
                apiSerializers = {
                    all: {
                        after: sinon.stub().resolves(),
                        before: sinon.stub().resolves()

                    },
                    default: {
                        add: sinon.stub().resolves(),
                        all: sinon.stub().resolves()

                    },
                    posts: {
                        add: sinon.stub().resolves()
                    }
                };
            });

            it('uses best match serializer when custom match exists', function () {
                const stubsToCheck = [
                    apiSerializers.all.before,
                    apiSerializers.posts.add
                ];

                return shared.serializers.handle.output(response, apiConfig, apiSerializers, frame)
                    .then(() => {
                        stubsToCheck.forEach((stub) => {
                            sinon.assert.calledOnceWithExactly(stub, response, apiConfig, frame);
                        });

                        // After has a different call signature... is this a intentional?
                        sinon.assert.calledOnceWithExactly(apiSerializers.all.after, apiConfig, frame);

                        sinon.assert.callOrder(apiSerializers.all.before, apiSerializers.posts.add, apiSerializers.all.after);

                        sinon.assert.notCalled(apiSerializers.default.add);
                        sinon.assert.notCalled(apiSerializers.default.all);
                    });
            });

            it('uses nearest fallback serializer when custom match does not exist', function () {
                apiConfig = {docName: 'posts', method: 'idontexist'};

                const stubsToCheck = [
                    apiSerializers.all.before,
                    apiSerializers.default.all
                ];

                return shared.serializers.handle.output(response, apiConfig, apiSerializers, frame)
                    .then(() => {
                        stubsToCheck.forEach((stub) => {
                            sinon.assert.calledOnceWithExactly(stub, response, apiConfig, frame);
                        });

                        // After has a different call signature... is this a intentional?
                        sinon.assert.calledOnceWithExactly(apiSerializers.all.after, apiConfig, frame);

                        sinon.assert.callOrder(apiSerializers.all.before, apiSerializers.default.all, apiSerializers.all.after);

                        sinon.assert.notCalled(apiSerializers.posts.add);
                        sinon.assert.notCalled(apiSerializers.default.add);
                    });
            });
        });

        describe('Custom, default and global (all) serializers with custom fallback', function () {
            beforeEach(function () {
                apiSerializers = {
                    all: {
                        after: sinon.stub().resolves(),
                        before: sinon.stub().resolves()

                    },
                    default: {
                        add: sinon.stub().resolves(),
                        all: sinon.stub().resolves()

                    },
                    posts: {
                        add: sinon.stub().resolves(),
                        all: sinon.stub().resolves()
                    }
                };
            });

            it('uses best match serializer when custom match exists', function () {
                const stubsToCheck = [
                    apiSerializers.all.before,
                    apiSerializers.posts.add
                ];

                return shared.serializers.handle.output(response, apiConfig, apiSerializers, frame)
                    .then(() => {
                        stubsToCheck.forEach((stub) => {
                            sinon.assert.calledOnceWithExactly(stub, response, apiConfig, frame);
                        });

                        // After has a different call signature... is this a intentional?
                        sinon.assert.calledOnceWithExactly(apiSerializers.all.after, apiConfig, frame);

                        sinon.assert.callOrder(apiSerializers.all.before, apiSerializers.posts.add, apiSerializers.all.after);

                        sinon.assert.notCalled(apiSerializers.posts.all);
                        sinon.assert.notCalled(apiSerializers.default.add);
                        sinon.assert.notCalled(apiSerializers.default.all);
                    });
            });

            it('uses nearest fallback serializer when custom match does not exist', function () {
                apiConfig = {docName: 'posts', method: 'idontexist'};

                const stubsToCheck = [
                    apiSerializers.all.before,
                    apiSerializers.posts.all
                ];

                return shared.serializers.handle.output(response, apiConfig, apiSerializers, frame)
                    .then(() => {
                        stubsToCheck.forEach((stub) => {
                            sinon.assert.calledOnceWithExactly(stub, response, apiConfig, frame);
                        });

                        // After has a different call signature... is this a intentional?
                        sinon.assert.calledOnceWithExactly(apiSerializers.all.after, apiConfig, frame);

                        sinon.assert.callOrder(apiSerializers.all.before, apiSerializers.posts.all, apiSerializers.all.after);

                        sinon.assert.notCalled(apiSerializers.posts.add);
                        sinon.assert.notCalled(apiSerializers.default.add);
                        sinon.assert.notCalled(apiSerializers.default.all);
                    });
            });
        });

        describe('Default and global (all) serializers work together correctly', function () {
            beforeEach(function () {
                apiSerializers = {
                    all: {
                        after: sinon.stub().resolves(),
                        before: sinon.stub().resolves()

                    },
                    default: {
                        add: sinon.stub().resolves(),
                        all: sinon.stub().resolves()
                    }
                };
            });

            it('correctly calls default serializer when no custom one is set', function () {
                const stubsToCheck = [
                    apiSerializers.all.before,
                    apiSerializers.default.add
                ];

                return shared.serializers.handle.output(response, apiConfig, apiSerializers, frame)
                    .then(() => {
                        stubsToCheck.forEach((stub) => {
                            sinon.assert.calledOnceWithExactly(stub, response, apiConfig, frame);
                        });

                        // After has a different call signature... is this a intentional?
                        sinon.assert.calledOnceWithExactly(apiSerializers.all.after, apiConfig, frame);

                        sinon.assert.callOrder(apiSerializers.all.before, apiSerializers.default.add, apiSerializers.all.after);
                        sinon.assert.notCalled(apiSerializers.default.all);
                    });
            });

            it('correctly uses fallback serializer when there is no default match', function () {
                apiConfig = {docName: 'posts', method: 'idontexist'};

                const stubsToCheck = [
                    apiSerializers.all.before,
                    apiSerializers.default.all
                ];

                return shared.serializers.handle.output(response, apiConfig, apiSerializers, frame)
                    .then(() => {
                        stubsToCheck.forEach((stub) => {
                            sinon.assert.calledOnceWithExactly(stub, response, apiConfig, frame);
                        });

                        // After has a different call signature... is this a intentional?
                        sinon.assert.calledOnceWithExactly(apiSerializers.all.after, apiConfig, frame);

                        sinon.assert.callOrder(apiSerializers.all.before, apiSerializers.default.all, apiSerializers.all.after);
                        sinon.assert.notCalled(apiSerializers.default.add);
                    });
            });
        });
    });
});
