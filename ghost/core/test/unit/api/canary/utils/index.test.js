const should = require('should');
const sinon = require('sinon');
const utils = require('../../../../../core/server/api/endpoints/utils');

describe('Unit: endpoints/utils/index', function () {
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

        it('is false when apiType is admin', function () {
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
