const errors = require('@tryghost/errors');
const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const shared = require('../../../../../../core/server/api/shared');

describe('Unit: api/shared/validators/input/all', function () {
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
                    should.exist(frame.options.page);
                    should.exist(frame.options.slug);
                    should.exist(frame.options.include);
                    should.exist(frame.options.context);
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
                    should.exist(err);
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
                    should.exist(frame.options.page);
                    should.exist(frame.options.slug);
                    should.exist(frame.options.include);
                    should.exist(frame.options.context);
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
                    should.exist(frame.options.page);
                    should.exist(frame.options.slug);
                    should.exist(frame.options.include);
                    should.exist(frame.options.context);
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
                .then(Promise.reject)
                .catch((err) => {
                    should.not.exist(err);
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
                .then(Promise.reject)
                .catch((err) => {
                    should.not.exist(err);
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
                    should.exist(err);
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
                    should.exist(err);
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
            should.exist(frame.options.context);
            should.exist(frame.data.status);
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
                    should.exist(err);
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
            shared.validators.input.all.browse.calledOnce.should.be.true();
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
                    should.exist(err);
                });
        });

        it('fails', function () {
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
                    should.exist(err);
                });
        });

        it('fails', function () {
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
                    should.exist(err);
                    err.message.should.eql('Validation (FieldIsRequired) failed for ["b"]');
                });
        });

        it('fails', function () {
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
                    should.exist(err);
                    err.message.should.eql('Validation (FieldIsInvalid) failed for ["b"]');
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
            (result instanceof Promise).should.not.be.true();
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
                    (err instanceof errors.BadRequestError).should.be.true();
                });
        });
    });
});
