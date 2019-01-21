const should = require('should');
const sinon = require('sinon');
const utils = require('../../../../server/api/v2/utils');

describe('Unit: v2/utils/index', function () {
    afterEach(function () {
        sinon.restore();
    });
    describe('isContentAPI', function () {
        it('is truthy when having api key and no user', function () {
            const frame = {
                options: {
                    context: {
                        api_key_id: 'api_key'
                    }
                }
            };
            should(utils.isContentAPI(frame)).equal(true);
        });

        it('is falsy when having api key and a user', function () {
            const frame = {
                options: {
                    context: {
                        user: {},
                        api_key_id: 'api_key'
                    }
                }
            };
            should(utils.isContentAPI(frame)).equal(false);
        });

        it('is truthy when context is empty', function () {
            const frame = {
                options: {
                    context: {
                    }
                }
            };
            should(utils.isContentAPI(frame)).equal(true);
        });

        it('is truthy when context is public', function () {
            const frame = {
                options: {
                    context: {
                        public: true
                    }
                }
            };
            should(utils.isContentAPI(frame)).equal(true);
        });
    });
});
