/* eslint-disable no-regex-spaces */
const proxy = require('../../../../core/frontend/services/proxy');
const {getFrontendKey} = proxy;
const should = require('should');

// Stuff we are testing
const content_api_key = require('../../../../core/frontend/helpers/content_api_key');

describe('{{content_api_key}} helper', function () {
    describe('compare to settings', function () {
        it('returns the content API key', async function () {
            const result = await content_api_key();
            const expected = await getFrontendKey();
            should.exist(result);
            String(result).should.equal(expected);
        });
    });
});

