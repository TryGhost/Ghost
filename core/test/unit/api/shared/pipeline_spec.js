const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const sandbox = sinon.sandbox.create();
const common = require('../../../../server/lib/common');
const shared = require('../../../../server/api/shared');

describe('Unit: api/shared/pipeline', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('stages', function () {
        describe('validation', function () {
            describe('input', function () {
                beforeEach(function () {
                    sandbox.stub(shared.validators.handle, 'input').resolves();
                });

                it('do it yourself', function () {
                    const apiUtils = {};
                    const apiConfig = {};
                    const apiImpl = {
                        validation: sandbox.stub().resolves('response')
                    };
                    const options = {};

                    return shared.pipeline.STAGES.validation.input(apiUtils, apiConfig, apiImpl, options)
                        .then((response) => {
                            response.should.eql('response');

                            apiImpl.validation.calledOnce.should.be.true();
                            shared.validators.handle.input.called.should.be.false();
                        });
                });

                it('default', function () {
                    const apiUtils = {
                        validators: {
                            posts: {}
                        }
                    };
                    const apiConfig = {
                        docName: 'posts'
                    };
                    const apiImpl = {
                        validation: {
                            queryOptions: ['include']
                        }
                    };
                    const options = {
                        apiOptions: {}
                    };

                    return shared.pipeline.STAGES.validation.input(apiUtils, apiConfig, apiImpl, options)
                        .then((response) => {
                            shared.validators.handle.input.calledWith(
                                {
                                    docName: 'posts',
                                    queryOptions: ['include']
                                },
                                {
                                    posts: {}
                                },
                                {
                                    apiOptions: {}
                                }).calledOnce.should.be.true();
                        });
                });
            });
        });

        describe('permissions', function () {
            let apiUtils;

            beforeEach(function () {
                apiUtils = {
                    permissions: {
                        handle: sandbox.stub().resolves()
                    }
                };
            });

            it('key is missing', function () {
                const apiConfig = {};
                const apiImpl = {};
                const options = {};

                return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, options)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.IncorrectUsageError).should.be.true();
                        apiUtils.permissions.handle.called.should.be.false();
                    });
            });

            it('do it yourself', function () {
                const apiConfig = {};
                const apiImpl = {
                    permissions: sandbox.stub().resolves('lol')
                };
                const options = {};

                return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, options)
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
                const options = {};

                return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, options)
                    .then(() => {
                        apiUtils.permissions.handle.called.should.be.false();
                    });
            });

            it('default', function () {
                const apiConfig = {};
                const apiImpl = {
                    permissions: true
                };
                const options = {};

                return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, options)
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
                const options = {
                    apiOptions: {}
                };

                return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, options)
                    .then(() => {
                        apiUtils.permissions.handle.calledWith(
                            {
                                docName: 'posts',
                                unsafeAttrs: ['test']
                            },
                            {
                                apiOptions: {}
                            }).calledOnce.should.be.true();
                    });
            });
        });
    });

    describe('pipeline', function () {
        beforeEach(function () {
            sandbox.stub(shared.pipeline.STAGES.validation, 'input');
            sandbox.stub(shared.pipeline.STAGES.serialisation, 'input');
            sandbox.stub(shared.pipeline.STAGES.serialisation, 'output');
            sandbox.stub(shared.pipeline.STAGES, 'permissions');
            sandbox.stub(shared.pipeline.STAGES, 'query');
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
            shared.pipeline.STAGES.serialisation.output.callsFake(function (response, apiUtils, apiConfig, apiImpl, options) {
                options.response = response;
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
});
