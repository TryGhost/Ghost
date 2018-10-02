const should = require('should');
const Promise = require('bluebird');
const sinon = require('sinon');
const common = require('../../../../../../server/lib/common');
const shared = require('../../../../../../server/api/shared');
const sandbox = sinon.sandbox.create();

describe('Unit: api/shared/validators/input/options', function () {
    beforeEach(function () {
        sandbox.restore();
    });

    describe('extra allowed internal options', function () {
        it('internal access', function () {
            const options = {
                apiOptions: {
                    context: {
                        internal: true
                    },
                    transacting: true,
                    forUpdate: true
                }
            };

            const apiConfig = {};

            shared.validators.input.options.all(apiConfig, options);

            should.exist(options.apiOptions.transacting);
            should.exist(options.apiOptions.forUpdate);
            should.exist(options.apiOptions.context);
        });

        it('no internal access', function () {
            const options = {
                apiOptions: {
                    context: {
                        user: true
                    },
                    transacting: true,
                    forUpdate: true
                }
            };

            const apiConfig = {};

            shared.validators.input.options.all(apiConfig, options);

            should.not.exist(options.apiOptions.transacting);
            should.not.exist(options.apiOptions.forUpdate);
            should.exist(options.apiOptions.context);
        });
    });

    describe('query options', function () {
        it('ensure correct transformation', function () {
            const options = {
                apiOptions: {
                    context: {
                        user: true
                    }
                },
                params: {
                    id: 'id'
                },
                query: {
                    include: 'tags'
                }
            };

            const apiConfig = {
                queryOptions: ['include', 'id']
            };

            shared.validators.input.options.all(apiConfig, options);

            should.exist(options.apiOptions.id);
            should.exist(options.apiOptions.include);
            should.exist(options.apiOptions.context);
            should.exist(options.queryData);
        });
    });

    describe('query data', function () {
        it('ensure correct transformation', function () {
            const options = {
                apiOptions: {
                    context: {
                        user: true
                    }
                },
                params: {
                    id: 'id'
                },
                query: {
                    status: 'tags'
                }
            };

            const apiConfig = {
                queryData: ['status', 'id']
            };

            shared.validators.input.options.all(apiConfig, options);

            should.exist(options.apiOptions.context);
            should.exist(options.queryData);
            should.exist(options.queryData.id);
            should.exist(options.queryData.status);
        });
    });
});
