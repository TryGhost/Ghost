const errors = require('@tryghost/errors');
const should = require('should');
const sinon = require('sinon');
const shared = require('../');

describe('Pipeline', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('stages', function () {
        describe('validation', function () {
            describe('input', function () {
                beforeEach(function () {
                    sinon.stub(shared.validators.handle, 'input').resolves();
                });

                it('do it yourself', function () {
                    const apiUtils = {};
                    const apiConfig = {};
                    const apiImpl = {
                        validation: sinon.stub().resolves('response')
                    };
                    const frame = {};

                    return shared.pipeline.STAGES.validation.input(apiUtils, apiConfig, apiImpl, frame)
                        .then((response) => {
                            response.should.eql('response');

                            apiImpl.validation.calledOnce.should.be.true();
                            shared.validators.handle.input.called.should.be.false();
                        });
                });

                it('default', function () {
                    const apiUtils = {
                        validators: {
                            input: {
                                posts: {}
                            }
                        }
                    };
                    const apiConfig = {
                        docName: 'posts'
                    };
                    const apiImpl = {
                        options: ['include'],
                        validation: {
                            options: {
                                include: {
                                    required: true
                                }
                            }
                        }
                    };
                    const frame = {
                        options: {}
                    };

                    return shared.pipeline.STAGES.validation.input(apiUtils, apiConfig, apiImpl, frame)
                        .then(() => {
                            shared.validators.handle.input.calledOnce.should.be.true();
                            shared.validators.handle.input.calledWith(
                                {
                                    docName: 'posts',
                                    options: {
                                        include: {
                                            required: true
                                        }
                                    }
                                },
                                {
                                    posts: {}
                                },
                                {
                                    options: {}
                                }).should.be.true();
                        });
                });
            });
        });

        describe('permissions', function () {
            let apiUtils;

            beforeEach(function () {
                apiUtils = {
                    permissions: {
                        handle: sinon.stub().resolves()
                    }
                };
            });

            it('key is missing', function () {
                const apiConfig = {};
                const apiImpl = {};
                const frame = {};

                return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof errors.IncorrectUsageError).should.be.true();
                        apiUtils.permissions.handle.called.should.be.false();
                    });
            });

            it('do it yourself', function () {
                const apiConfig = {};
                const apiImpl = {
                    permissions: sinon.stub().resolves('lol')
                };
                const frame = {};

                return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, frame)
                    .then((response) => {
                        response.should.eql('lol');
                        apiImpl.permissions.calledOnce.should.be.true();
                        apiUtils.permissions.handle.called.should.be.false();
                    });
            });

            it('skip stage', function () {
                const apiConfig = {};
                const apiImpl = {
                    permissions: false
                };
                const frame = {};

                return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, frame)
                    .then(() => {
                        apiUtils.permissions.handle.called.should.be.false();
                    });
            });

            it('default', function () {
                const apiConfig = {};
                const apiImpl = {
                    permissions: true
                };
                const frame = {};

                return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, frame)
                    .then(() => {
                        apiUtils.permissions.handle.calledOnce.should.be.true();
                    });
            });

            it('with permission config', function () {
                const apiConfig = {
                    docName: 'posts'
                };
                const apiImpl = {
                    permissions: {
                        unsafeAttrs: ['test']
                    }
                };
                const frame = {
                    options: {}
                };

                return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, frame)
                    .then(() => {
                        apiUtils.permissions.handle.calledOnce.should.be.true();
                        apiUtils.permissions.handle.calledWith(
                            {
                                docName: 'posts',
                                unsafeAttrs: ['test']
                            },
                            {
                                options: {}
                            }).should.be.true();
                    });
            });
        });
    });

    describe('pipeline', function () {
        beforeEach(function () {
            sinon.stub(shared.pipeline.STAGES.validation, 'input');
            sinon.stub(shared.pipeline.STAGES.serialisation, 'input');
            sinon.stub(shared.pipeline.STAGES.serialisation, 'output');
            sinon.stub(shared.pipeline.STAGES, 'permissions');
            sinon.stub(shared.pipeline.STAGES, 'query');
        });

        it('ensure we receive a callable api controller fn', function () {
            const apiController = {
                add: {},
                browse: {}
            };

            const apiUtils = {};

            const result = shared.pipeline(apiController, apiUtils);
            result.should.be.an.Object();

            should.exist(result.add);
            should.exist(result.browse);
            result.add.should.be.a.Function();
            result.browse.should.be.a.Function();
        });

        it('call api controller fn', function () {
            const apiController = {
                add: {}
            };

            const apiUtils = {};
            const result = shared.pipeline(apiController, apiUtils);

            shared.pipeline.STAGES.validation.input.resolves();
            shared.pipeline.STAGES.serialisation.input.resolves();
            shared.pipeline.STAGES.permissions.resolves();
            shared.pipeline.STAGES.query.resolves('response');
            shared.pipeline.STAGES.serialisation.output.callsFake(function (response, _apiUtils, apiConfig, apiImpl, frame) {
                frame.response = response;
            });

            return result.add()
                .then((response) => {
                    response.should.eql('response');

                    shared.pipeline.STAGES.validation.input.calledOnce.should.be.true();
                    shared.pipeline.STAGES.serialisation.input.calledOnce.should.be.true();
                    shared.pipeline.STAGES.permissions.calledOnce.should.be.true();
                    shared.pipeline.STAGES.query.calledOnce.should.be.true();
                    shared.pipeline.STAGES.serialisation.output.calledOnce.should.be.true();
                });
        });

        it('api controller is fn, not config', function () {
            const apiController = {
                add() {
                    return Promise.resolve('response');
                }
            };

            const apiUtils = {};
            const result = shared.pipeline(apiController, apiUtils);

            return result.add()
                .then((response) => {
                    response.should.eql('response');

                    shared.pipeline.STAGES.validation.input.called.should.be.false();
                    shared.pipeline.STAGES.serialisation.input.called.should.be.false();
                    shared.pipeline.STAGES.permissions.called.should.be.false();
                    shared.pipeline.STAGES.query.called.should.be.false();
                    shared.pipeline.STAGES.serialisation.output.called.should.be.false();
                });
        });
    });

    describe('caching', function () {
        beforeEach(function () {
            sinon.stub(shared.pipeline.STAGES.validation, 'input');
            sinon.stub(shared.pipeline.STAGES.serialisation, 'input');
            sinon.stub(shared.pipeline.STAGES.serialisation, 'output');
            sinon.stub(shared.pipeline.STAGES, 'permissions');
            sinon.stub(shared.pipeline.STAGES, 'query');
        });

        it('should set a cache if configured on endpoint level', async function () {
            const apiController = {
                browse: {
                    cache: {
                        get: sinon.stub().resolves(null),
                        set: sinon.stub().resolves(true)
                    }
                }
            };

            const apiUtils = {};
            const result = shared.pipeline(apiController, apiUtils);

            shared.pipeline.STAGES.validation.input.resolves();
            shared.pipeline.STAGES.serialisation.input.resolves();
            shared.pipeline.STAGES.permissions.resolves();
            shared.pipeline.STAGES.query.resolves('response');
            shared.pipeline.STAGES.serialisation.output.callsFake(function (response, _apiUtils, apiConfig, apiImpl, frame) {
                frame.response = response;
            });

            const response = await result.browse();

            response.should.eql('response');

            // request went through all stages
            shared.pipeline.STAGES.validation.input.calledOnce.should.be.true();
            shared.pipeline.STAGES.serialisation.input.calledOnce.should.be.true();
            shared.pipeline.STAGES.permissions.calledOnce.should.be.true();
            shared.pipeline.STAGES.query.calledOnce.should.be.true();
            shared.pipeline.STAGES.serialisation.output.calledOnce.should.be.true();

            // cache was set
            apiController.browse.cache.set.calledOnce.should.be.true();
            apiController.browse.cache.set.args[0][1].should.equal('response');
        });

        it('should use cache if configured on endpoint level', async function () {
            const apiController = {
                browse: {
                    cache: {
                        get: sinon.stub().resolves('CACHED RESPONSE'),
                        set: sinon.stub().resolves(true)
                    }
                }
            };

            const apiUtils = {};
            const result = shared.pipeline(apiController, apiUtils);

            shared.pipeline.STAGES.validation.input.resolves();
            shared.pipeline.STAGES.serialisation.input.resolves();
            shared.pipeline.STAGES.permissions.resolves();
            shared.pipeline.STAGES.query.resolves('response');
            shared.pipeline.STAGES.serialisation.output.callsFake(function (response, _apiUtils, apiConfig, apiImpl, frame) {
                frame.response = response;
            });

            const response = await result.browse();

            response.should.eql('CACHED RESPONSE');

            // request went through all stages
            shared.pipeline.STAGES.validation.input.calledOnce.should.be.false();
            shared.pipeline.STAGES.serialisation.input.calledOnce.should.be.false();
            shared.pipeline.STAGES.permissions.calledOnce.should.be.false();
            shared.pipeline.STAGES.query.calledOnce.should.be.false();
            shared.pipeline.STAGES.serialisation.output.calledOnce.should.be.false();

            // cache not set
            apiController.browse.cache.set.calledOnce.should.be.false();
        });
    });
});
