const errors = require('@tryghost/errors');
const assert = require('node:assert/strict');
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
                            assert.equal(response, 'response');

                            assert.equal(apiImpl.validation.calledOnce, true);
                            assert.equal(shared.validators.handle.input.called, false);
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
                            assert.equal(shared.validators.handle.input.calledOnce, true);
                            assert.equal(shared.validators.handle.input.calledWith(
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
                                }), true);
                        });
                });
            });
        });

        describe('serialisation', function () {
            it('input calls shared serializer input handler', function () {
                sinon.stub(shared.serializers.handle, 'input').resolves();

                const apiUtils = {serializers: {input: {posts: {}}}};
                const apiConfig = {docName: 'posts', method: 'browse'};
                const apiImpl = {data: ['id']};
                const frame = {};

                return shared.pipeline.STAGES.serialisation.input(apiUtils, apiConfig, apiImpl, frame)
                    .then(() => {
                        assert.equal(shared.serializers.handle.input.calledOnce, true);
                        assert.deepEqual(shared.serializers.handle.input.args[0][0], {
                            data: ['id'],
                            docName: 'posts',
                            method: 'browse'
                        });
                    });
            });

            it('output calls shared serializer output handler', function () {
                sinon.stub(shared.serializers.handle, 'output').resolves();

                const apiUtils = {serializers: {output: {posts: {}}}};
                const apiConfig = {docName: 'posts', method: 'browse'};
                const apiImpl = {};
                const frame = {};
                const response = [{id: '1'}];

                return shared.pipeline.STAGES.serialisation.output(response, apiUtils, apiConfig, apiImpl, frame)
                    .then(() => {
                        assert.equal(shared.serializers.handle.output.calledOnceWithExactly(response, apiConfig, apiUtils.serializers.output, frame), true);
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
                        assert.equal(err instanceof errors.IncorrectUsageError, true);
                        assert.equal(apiUtils.permissions.handle.called, false);
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
                        assert.equal(response, 'lol');
                        assert.equal(apiImpl.permissions.calledOnce, true);
                        assert.equal(apiUtils.permissions.handle.called, false);
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
                        assert.equal(apiUtils.permissions.handle.called, false);
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
                        assert.equal(apiUtils.permissions.handle.calledOnce, true);
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
                        assert.equal(apiUtils.permissions.handle.calledOnce, true);
                        assert.equal(apiUtils.permissions.handle.calledWith(
                            {
                                docName: 'posts',
                                unsafeAttrs: ['test']
                            },
                            {
                                options: {}
                            }), true);
                    });
            });

            it('runs permission before hook', function () {
                const before = sinon.stub().resolves();
                const apiConfig = {};
                const apiImpl = {
                    permissions: {
                        before
                    }
                };
                const frame = {};

                return shared.pipeline.STAGES.permissions(apiUtils, apiConfig, apiImpl, frame)
                    .then(() => {
                        assert.equal(before.calledOnceWithExactly(frame), true);
                        assert.equal(apiUtils.permissions.handle.calledOnce, true);
                    });
            });
        });

        describe('query', function () {
            it('throws when query method is missing', function () {
                return shared.pipeline.STAGES.query({}, {}, {}, {})
                    .then(Promise.reject)
                    .catch((err) => {
                        assert.equal(err instanceof errors.IncorrectUsageError, true);
                    });
            });

            it('runs query when configured', function () {
                const query = sinon.stub().resolves('result');
                const frame = {};
                return shared.pipeline.STAGES.query({}, {}, {query}, frame)
                    .then((result) => {
                        assert.equal(result, 'result');
                        assert.equal(query.calledOnceWithExactly(frame), true);
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
            assert.equal(typeof result, 'object');

            assert.ok(result.add);
            assert.ok(result.browse);
            assert.equal(typeof result.add, 'function');
            assert.equal(typeof result.browse, 'function');
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
                    assert.equal(response, 'response');

                    assert.equal(shared.pipeline.STAGES.validation.input.calledOnce, true);
                    assert.equal(shared.pipeline.STAGES.serialisation.input.calledOnce, true);
                    assert.equal(shared.pipeline.STAGES.permissions.calledOnce, true);
                    assert.equal(shared.pipeline.STAGES.query.calledOnce, true);
                    assert.equal(shared.pipeline.STAGES.serialisation.output.calledOnce, true);
                });
        });

        it('supports data and options arguments', function () {
            const apiController = {
                docName: 'posts',
                add: {
                    headers: {},
                    permissions: true,
                    query: sinon.stub().resolves('response')
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

            return result.add({posts: [{title: 't'}]}, {context: {internal: true}})
                .then(() => {
                    const frame = shared.pipeline.STAGES.validation.input.args[0][3];
                    assert.deepEqual(frame.data, {posts: [{title: 't'}]});
                    assert.deepEqual(frame.options.context, {internal: true});
                });
        });

        it('supports single undefined argument by defaulting options', function () {
            const apiController = {
                docName: 'posts',
                add: {
                    headers: {},
                    permissions: true,
                    query: sinon.stub().resolves('response')
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

            return result.add(undefined)
                .then(() => {
                    const frame = shared.pipeline.STAGES.validation.input.args[0][3];
                    assert.deepEqual(frame.options.context, {});
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
                    assert.equal(response, 'response');

                    assert.equal(shared.pipeline.STAGES.validation.input.called, false);
                    assert.equal(shared.pipeline.STAGES.serialisation.input.called, false);
                    assert.equal(shared.pipeline.STAGES.permissions.called, false);
                    assert.equal(shared.pipeline.STAGES.query.called, false);
                    assert.equal(shared.pipeline.STAGES.serialisation.output.called, false);
                });
        });

        it('uses existing frame instance and generateCacheKeyData', async function () {
            const apiController = {
                browse: {
                    headers: {},
                    permissions: true,
                    generateCacheKeyData: sinon.stub().resolves({custom: 'key'}),
                    query: sinon.stub().resolves('response')
                }
            };

            const apiUtils = {};
            const result = shared.pipeline(apiController, apiUtils, 'content');
            const frame = new shared.Frame();

            shared.pipeline.STAGES.validation.input.resolves();
            shared.pipeline.STAGES.serialisation.input.resolves();
            shared.pipeline.STAGES.permissions.resolves();
            shared.pipeline.STAGES.query.resolves('response');
            shared.pipeline.STAGES.serialisation.output.callsFake(function (response, _apiUtils, apiConfig, apiImpl, frameArg) {
                frameArg.response = response;
            });

            const response = await result.browse(frame);

            assert.equal(response, 'response');
            assert.equal(apiController.browse.generateCacheKeyData.calledOnceWithExactly(frame), true);
            assert.equal(frame.apiType, 'content');
            assert.equal(frame.docName, undefined);
            assert.equal(frame.method, 'browse');
        });

        it('returns cached controller wrapper for same controller object', function () {
            const apiController = {
                docName: 'posts',
                browse: {
                    headers: {},
                    permissions: true,
                    query: sinon.stub().resolves('response')
                }
            };

            const first = shared.pipeline(apiController, {});
            const second = shared.pipeline(apiController, {});

            assert.equal(first, second);
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

            assert.equal(response, 'response');

            // request went through all stages
            assert.equal(shared.pipeline.STAGES.validation.input.calledOnce, true);
            assert.equal(shared.pipeline.STAGES.serialisation.input.calledOnce, true);
            assert.equal(shared.pipeline.STAGES.permissions.calledOnce, true);
            assert.equal(shared.pipeline.STAGES.query.calledOnce, true);
            assert.equal(shared.pipeline.STAGES.serialisation.output.calledOnce, true);

            // cache was set
            assert.equal(apiController.browse.cache.set.calledOnce, true);
            assert.equal(apiController.browse.cache.set.args[0][1], 'response');
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

            assert.equal(response, 'CACHED RESPONSE');

            // request went through all stages
            assert.equal(shared.pipeline.STAGES.validation.input.calledOnce, false);
            assert.equal(shared.pipeline.STAGES.serialisation.input.calledOnce, false);
            assert.equal(shared.pipeline.STAGES.permissions.calledOnce, false);
            assert.equal(shared.pipeline.STAGES.query.calledOnce, false);
            assert.equal(shared.pipeline.STAGES.serialisation.output.calledOnce, false);

            // cache not set
            assert.equal(apiController.browse.cache.set.calledOnce, false);
        });
    });
});
