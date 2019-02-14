const should = require('should');
const sinon = require('sinon');
const utils = require('../../../../server/api/v2/utils');

describe('Unit: v2/utils/index', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('isContentAPI', function () {
        it('is true when apiType is "content"', function () {
            const frame = {
                apiType: 'content'
            };
            should(utils.isContentAPI(frame)).equal(true);
        });

        it('is true when options.context.public is true', function () {
            const frame = {
                options: {
                    context: {
                        public: true
                    }
                }
            };
            should(utils.isContentAPI(frame)).equal(true);
        });

        it('is true when options.context is empty', function () {
            const frame = {
                options: {
                    context: {}
                }
            };
            should(utils.isContentAPI(frame)).equal(true);
        });

        it('is false when options.context has no public value and apiType is not content', function () {
            const frame = {
                apiType: 'admin',
                options: {
                    context: {
                        no: 'public'
                    }
                }
            };
            should(utils.isContentAPI(frame)).equal(false);
        });
    });
});
