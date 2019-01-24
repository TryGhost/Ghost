const should = require('should');
const sinon = require('sinon');
const utils = require('../../../../server/api/v2/utils');

describe('Unit: v2/utils/index', function () {
    afterEach(function () {
        sinon.restore();
    });
    describe('isContentAPI', function () {
        it('is truthy when having api key of content type', function () {
            const frame = {
                options: {
                    context: {
                        api_key: {
                            id: 'keyId',
                            type: 'content'
                        }
                    }
                }
            };
            should(utils.isContentAPI(frame)).equal(true);
        });

        it.only('is falsy when having api key and a user', function () {
            const frame = {
                options: {
                    context: {
                        user: {},
                        api_key: {
                            id: 'keyId',
                            type: 'content'
                        }
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
