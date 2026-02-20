const errors = require('@tryghost/errors');
const assert = require('node:assert/strict');
const sinon = require('sinon');
const shared = require('../../../');

describe('validators/input/all', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('all', function () {
        it('default', function () {
            const frame = {
                options: {
                    context: {},
                    slug: 'slug',
                    include: 'tags,authors',
                    page: 2
                }
            };

            const apiConfig = {
                options: {
                    include: {
                        values: ['tags', 'authors'],
                        required: true
                    }
                }
            };

            return shared.validators.input.all.all(apiConfig, frame)
                .then(() => {
                    assert.ok(frame.options.page);
                    assert.ok(frame.options.slug);
                    assert.ok(frame.options.include);
                    assert.ok(frame.options.context);
                });
        });

        it('should run global validations on an type that has validation defined', function () {
            const frame = {
                options: {
                    slug: 'not a valid slug %%%%% http://'
                }
            };

            const apiConfig = {
                options: {
                    slug: {
                        required: true
                    }
                }
            };

            return shared.validators.input.all.all(apiConfig, frame)
                .then(() => {
                    throw new Error('Should not resolve');
                }, (err) => {
                    assert.ok(err);
                });
        });

        it('allows empty values', function () {
            const frame = {
                options: {
                    context: {},
                    formats: ''
                }
            };

            const apiConfig = {
                options: {
                    formats: ['format1']
                }
            };

            return shared.validators.input.all.all(apiConfig, frame);
        });

        it('supports include being an array', function () {
            const frame = {
                options: {
                    context: {},
                    slug: 'slug',
                    include: ['tags', 'authors'],
                    page: 2
                }
            };

            const apiConfig = {
                options: {
                    include: {
                        values: ['tags', 'authors'],
                        required: true
                    }
                }
            };

            return shared.validators.input.all.all(apiConfig, frame)
                .then(() => {
                    assert.ok(frame.options.page);
                    assert.ok(frame.options.slug);
                    assert.ok(frame.options.include);
                    assert.ok(frame.options.context);
                });
        });

        it('default include array notation', function () {
            const frame = {
                options: {
                    context: {},
                    slug: 'slug',
                    include: 'tags,authors',
                    page: 2
                }
            };

            const apiConfig = {
                options: {
                    include: ['tags', 'authors']
                }
            };

            return shared.validators.input.all.all(apiConfig, frame)
                .then(() => {
                    assert.ok(frame.options.page);
                    assert.ok(frame.options.slug);
                    assert.ok(frame.options.include);
                    assert.ok(frame.options.context);
                });
        });

        it('does not fail', function () {
            const frame = {
                options: {
                    context: {},
                    include: 'tags,authors'
                }
            };

            const apiConfig = {
                options: {
                    include: {
                        values: ['tags']
                    }
                }
            };

            return shared.validators.input.all.all(apiConfig, frame)
                .then(Promise.reject.bind(Promise))
                .catch((err) => {
                    assert.equal(err, undefined);
                });
        });

        it('does not fail include array notation', function () {
            const frame = {
                options: {
                    context: {},
                    include: 'tags,authors'
                }
            };

            const apiConfig = {
                options: {
                    include: ['tags']
                }
            };

            return shared.validators.input.all.all(apiConfig, frame)
                .then(Promise.reject.bind(Promise))
                .catch((err) => {
                    assert.equal(err, undefined);
                });
        });

        it('fails', function () {
            const frame = {
                options: {
                    context: {}
                }
            };

            const apiConfig = {
                options: {
                    include: {
                        required: true
                    }
                }
            };

            return shared.validators.input.all.all(apiConfig, frame)
                .then(Promise.reject)
                .catch((err) => {
                    assert.ok(err);
                });
        });

        it('invalid fields', function () {
            const frame = {
                options: {
                    context: {},
                    id: 'invalid'
                }
            };

            const apiConfig = {};

            return shared.validators.input.all.all(apiConfig, frame)
                .then(Promise.reject)
                .catch((err) => {
                    assert.ok(err);
                });
        });

        it('fails on invalid allowed values for non-include fields', function () {
            const frame = {
                options: {
                    context: {},
                    formats: 'mobiledoc'
                }
            };

            const apiConfig = {
                options: {
                    formats: ['html']
                }
            };

            return shared.validators.input.all.all(apiConfig, frame)
                .then(Promise.reject)
                .catch((err) => {
                    assert.ok(err);
                    assert.equal(err.message, 'Validation (AllowedValues) failed for formats');
                });
        });
    });

    describe('browse', function () {
        it('default', function () {
            const frame = {
                options: {
                    context: {}
                },
                data: {
                    status: 'aus'
                }
            };

            const apiConfig = {};

            shared.validators.input.all.browse(apiConfig, frame);
            assert.ok(frame.options.context);
            assert.ok(frame.data.status);
        });

        it('fails', function () {
            const frame = {
                options: {
                    context: {}
                },
                data: {
                    id: 'no-id'
                }
            };

            const apiConfig = {};

            return shared.validators.input.all.browse(apiConfig, frame)
                .then(Promise.reject)
                .catch((err) => {
                    assert.ok(err);
                });
        });
    });

    describe('read', function () {
        it('default', function () {
            sinon.stub(shared.validators.input.all, 'browse');

            const frame = {
                options: {
                    context: {}
                }
            };

            const apiConfig = {};

            shared.validators.input.all.read(apiConfig, frame);
            assert.equal(shared.validators.input.all.browse.calledOnce, true);
        });
    });

    describe('add', function () {
        it('fails', function () {
            const frame = {
                data: {}
            };

            const apiConfig = {
                docName: 'docName'
            };

            return shared.validators.input.all.add(apiConfig, frame)
                .then(Promise.reject)
                .catch((err) => {
                    assert.ok(err);
                });
        });

        it('fails with docName', function () {
            const frame = {
                data: {
                    docName: true
                }
            };

            const apiConfig = {
                docName: 'docName'
            };

            return shared.validators.input.all.add(apiConfig, frame)
                .then(Promise.reject)
                .catch((err) => {
                    assert.ok(err);
                });
        });

        it('fails for required field', function () {
            const frame = {
                data: {
                    docName: [{
                        a: 'b'
                    }]
                }
            };

            const apiConfig = {
                docName: 'docName',
                data: {
                    b: {
                        required: true
                    }
                }
            };

            return shared.validators.input.all.add(apiConfig, frame)
                .then(Promise.reject)
                .catch((err) => {
                    assert.ok(err);
                    assert.equal(err.message, 'Validation (FieldIsRequired) failed for ["b"]');
                });
        });

        it('fails for invalid field', function () {
            const frame = {
                data: {
                    docName: [{
                        a: 'b',
                        b: null
                    }]
                }
            };

            const apiConfig = {
                docName: 'docName',
                data: {
                    b: {
                        required: true
                    }
                }
            };

            return shared.validators.input.all.add(apiConfig, frame)
                .then(Promise.reject)
                .catch((err) => {
                    assert.ok(err);
                    assert.equal(err.message, 'Validation (FieldIsInvalid) failed for ["b"]');
                });
        });

        it('success', function () {
            const frame = {
                data: {
                    docName: [{
                        a: 'b'
                    }]
                }
            };

            const apiConfig = {
                docName: 'docName'
            };

            const result = shared.validators.input.all.add(apiConfig, frame);
            assert.equal(result instanceof Promise, false);
        });
    });

    describe('edit', function () {
        it('id mismatch', function () {
            const apiConfig = {
                docName: 'users'
            };

            const frame = {
                options: {
                    id: 'zwei'
                },
                data: {
                    posts: [
                        {
                            id: 'eins'
                        }
                    ]
                }
            };

            return shared.validators.input.all.edit(apiConfig, frame)
                .then(Promise.reject)
                .catch((err) => {
                    assert.equal(err instanceof errors.BadRequestError, true);
                });
        });

        it('returns add promise result when add fails', function () {
            sinon.stub(shared.validators.input.all, 'add').returns(Promise.reject(new Error('add-failed')));
            return shared.validators.input.all.edit({}, {})
                .then(Promise.reject)
                .catch((err) => {
                    assert.equal(err.message, 'add-failed');
                });
        });

        it('checks id mismatch after successful add for non posts/tags', function () {
            sinon.stub(shared.validators.input.all, 'add').returns(undefined);

            return shared.validators.input.all.edit({
                docName: 'users'
            }, {
                options: {
                    id: 'id-1'
                },
                data: {
                    users: [{id: 'id-2'}]
                }
            })
                .then(Promise.reject)
                .catch((err) => {
                    assert.equal(err instanceof errors.BadRequestError, true);
                    assert.equal(err.message, 'Invalid id provided.');
                });
        });

        it('does not check id mismatch for posts/tags', function () {
            sinon.stub(shared.validators.input.all, 'add').returns(undefined);
            const result = shared.validators.input.all.edit({
                docName: 'posts'
            }, {
                options: {id: 'id-1'},
                data: {
                    posts: [{id: 'id-2'}]
                }
            });
            assert.equal(result, undefined);
        });
    });

    describe('delegated methods', function () {
        it('changePassword delegates to add', function () {
            sinon.stub(shared.validators.input.all, 'add').returns('add-result');
            const result = shared.validators.input.all.changePassword({}, {});
            assert.equal(result, 'add-result');
        });

        it('resetPassword delegates to add', function () {
            sinon.stub(shared.validators.input.all, 'add').returns('add-result');
            const result = shared.validators.input.all.resetPassword({}, {});
            assert.equal(result, 'add-result');
        });

        it('setup delegates to add', function () {
            sinon.stub(shared.validators.input.all, 'add').returns('add-result');
            const result = shared.validators.input.all.setup({}, {});
            assert.equal(result, 'add-result');
        });

        it('publish delegates to browse', function () {
            sinon.stub(shared.validators.input.all, 'browse').returns('browse-result');
            const result = shared.validators.input.all.publish({}, {});
            assert.equal(result, 'browse-result');
        });
    });
});
