const assert = require('node:assert/strict');
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
            assert.equal(utils.isContentAPI(frame), true);
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
            assert.equal(utils.isContentAPI(frame), false);
        });
    });
});
