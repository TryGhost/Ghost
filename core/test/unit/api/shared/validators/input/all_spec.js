const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const shared = require('../../../../../../server/api/shared');
const sandbox = sinon.sandbox.create();

describe('Unit: api/shared/validators/input/all', function () {
    afterEach(function () {
        sandbox.restore();
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
