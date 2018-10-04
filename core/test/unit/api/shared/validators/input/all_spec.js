const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const shared = require('../../../../../../server/api/shared');
const sandbox = sinon.sandbox.create();

describe('Unit: api/shared/validators/input/all', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('extra allowed internal options', function () {
        it('internal access', function () {
            const frame = {
                options: {
                    context: {
                        internal: true
                    },
                    transacting: true,
                    forUpdate: true
                }
            };

            const apiConfig = {};

            shared.validators.input.all(apiConfig, frame);

            should.exist(frame.options.transacting);
            should.exist(frame.options.forUpdate);
            should.exist(frame.options.context);
        });

        it('no internal access', function () {
            const frame = {
                options: {
                    context: {
                        user: true
                    },
                    transacting: true,
                    forUpdate: true
                }
            };

            const apiConfig = {};

            shared.validators.input.all(apiConfig, frame);

            should.not.exist(frame.options.transacting);
            should.not.exist(frame.options.forUpdate);
            should.exist(frame.options.context);
        });
    });

    describe('validate options', function () {
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

            return shared.validators.input.all(apiConfig, frame)
                .then(() => {
                    should.exist(frame.options.page);
                    should.exist(frame.options.slug);
                    should.exist(frame.options.include);
                    should.exist(frame.options.context);
                });
        });

        it('fails', function () {
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

            return shared.validators.input.all(apiConfig, frame)
                .then(Promise.reject)
                .catch((err) => {
                    should.exist(err);
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

            return shared.validators.input.all(apiConfig, frame)
                .then(Promise.reject)
                .catch((err) => {
                    should.exist(err);
                });
        });
    });

    describe('validate data', function () {
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

            return shared.validators.input.all(apiConfig, frame)
                .then(() => {
                    should.exist(frame.options.context);
                    should.exist(frame.data.status);
                });
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

            return shared.validators.input.all(apiConfig, frame)
                .catch((err) => {
                    should.exist(err);
                });
            });
    });
});
