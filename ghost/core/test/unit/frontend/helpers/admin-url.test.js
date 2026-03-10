const assert = require('node:assert/strict');
const sinon = require('sinon');

const admin_url = require('../../../../core/frontend/helpers/admin_url');
const {urlUtils} = require('../../../../core/frontend/services/proxy');

describe('{{admin_url}} helper', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('returns the configured admin URL', function () {
        sinon.stub(urlUtils, 'urlFor').withArgs('admin', true).returns('https://admin.example.com/ghost/');

        assert.equal(String(admin_url()), 'https://admin.example.com/ghost/');
    });
});
