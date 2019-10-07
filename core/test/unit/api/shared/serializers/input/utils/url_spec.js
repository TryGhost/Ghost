const should = require('should');
const sinon = require('sinon');
const urlUtils = require('../../../../../../../server/lib/url-utils');
const url = require('../../../../../../../server/api/v2/utils/serializers/input/utils/url');

describe('Unit: v2/utils/serializers/input/utils/url', function () {
    describe('forPost', function () {
        beforeEach(function () {
            sinon.stub(urlUtils, 'getSiteUrl')
                .returns('https://blogurl.com');
        });

        afterEach(function () {
            sinon.restore();
        });
    });
});
