const _ = require('lodash');
const assert = require('node:assert/strict');
const sinon = require('sinon');
const validators = require('../../../../../../../core/server/api/endpoints/utils/validators');

describe('Unit: endpoints/utils/validators/input/tags', function () {
    let warnStub;
    let sawExpectedStrictWarning = false;

    beforeEach(function () {
        // The published `tags-add` schema in @tryghost/admin-api-schema declares
        // `additionalProperties` on its `tags` property without a `type: object`,
        // so Ajv emits a one-off strict-mode warning via console.warn when it
        // compiles the schema on the first validate() call. Capture it so a
        // passing run stays clean; allow only that exact warning through.
        warnStub = sinon.stub(console, 'warn');
    });

    afterEach(function () {
        for (const call of warnStub.getCalls()) {
            const message = String(call.args[0]);
            if (/strict mode: missing type "object" for keyword "additionalProperties"/.test(message)) {
                sawExpectedStrictWarning = true;
            } else {
                assert.fail(`Unexpected console.warn during tags validator test: ${message}`);
            }
        }

        sinon.restore();
    });

    afterAll(function () {
        assert.ok(sawExpectedStrictWarning, 'expected the Ajv strict-mode warning to be emitted and captured');
    });

    describe('add', function () {
        const apiConfig = {
            docName: 'tags',
            method: 'add'
        };

        describe('required fields', function () {
            it('should fail with no data', function () {
                const frame = {
                    options: {},
                    data: {}
                };

                return validators.input.tags.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        assert.equal(err.errorType, 'ValidationError');
                    });
            });

            it('should fail with no tags', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: []
                    }
                };

                return validators.input.tags.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        assert.equal(err.errorType, 'ValidationError');
                    });
            });

            it('should fail with no tags in array', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: []
                    }
                };

                return validators.input.tags.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        assert.equal(err.errorType, 'ValidationError');
                    });
            });

            it('should fail with more than tags', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: [],
                        posts: []
                    }
                };

                return validators.input.tags.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        assert.equal(err.errorType, 'ValidationError');
                    });
            });

            it('should fail without required fields', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: [{
                            what: 'a fail'
                        }]
                    }
                };

                return validators.input.tags.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        assert.equal(err.errorType, 'ValidationError');
                    });
            });

            it('should pass with required fields', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: [{
                            name: 'pass'
                        }]
                    }
                };

                return validators.input.tags.add(apiConfig, frame);
            });

            it('should remove `strip`able fields and leave regular fields', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: [{
                            name: 'pass',
                            parent: 'strip me',
                            created_at: 'strip me',
                            updated_at: 'strip me'
                        }]
                    }
                };

                let result = validators.input.tags.add(apiConfig, frame);

                assert(frame.data.tags[0].name);
                assert.equal(frame.data.tags[0].parent, undefined);
                assert.equal(frame.data.tags[0].created_at, undefined);
                assert.equal(frame.data.tags[0].updated_at, undefined);

                return result;
            });
        });

        describe('field formats', function () {
            const fieldMap = {
                name: [123, new Date(), ',starts-with-coma', '', _.repeat('a', 192), null],
                slug: [123, new Date(), _.repeat('a', 192)],
                description: [123, new Date(), _.repeat('a', 501)],
                feature_image: [123, new Date(), 'not uri'],
                visibility: [123, new Date(), 'abc', null],
                meta_title: [123, new Date(), _.repeat('a', 301)],
                meta_description: [123, new Date(), _.repeat('a', 501)]
            };

            Object.keys(fieldMap).forEach((key) => {
                it(`should fail for bad ${key}`, function () {
                    const badValues = fieldMap[key];

                    const checks = badValues.map((value) => {
                        const tag = {};
                        tag[key] = value;

                        if (key !== 'name') {
                            tag.name = 'abc';
                        }

                        const frame = {
                            options: {},
                            data: {
                                tags: [tag]
                            }
                        };

                        return validators.input.tags.add(apiConfig, frame)
                            .then(Promise.reject)
                            .catch((err) => {
                                assert.equal(err.errorType, 'ValidationError');
                            });
                    });

                    return Promise.all(checks);
                });
            });
        });
    });

    describe('edit', function () {
        const apiConfig = {
            docName: 'tags',
            method: 'edit'
        };

        describe('required fields', function () {
            it('should fail with no data', function () {
                const frame = {
                    options: {},
                    data: {}
                };

                return validators.input.tags.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        assert.equal(err.errorType, 'ValidationError');
                    });
            });

            it('should fail with no tags', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: []
                    }
                };

                return validators.input.tags.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        assert.equal(err.errorType, 'ValidationError');
                    });
            });

            it('should fail with more than tags', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: [],
                        posts: []
                    }
                };

                return validators.input.tags.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        assert.equal(err.errorType, 'ValidationError');
                    });
            });

            it('should pass with some fields', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: [{
                            name: 'pass'
                        }]
                    }
                };

                return validators.input.tags.edit(apiConfig, frame);
            });
        });
    });
});