const should = require('should');
const path = require('path');
const fs = require('fs-extra');

const DynamicRedirectManager = require('@tryghost/express-dynamic-redirects');
const CustomRedirectsAPI = require('../../../../../core/server/services/redirects/api');

describe('UNIT: redirects CustomRedirectsAPI class', function () {
    describe('get', function () {
        it('returns nothing if file does not exist', async function () {
            // Just set any content folder, which does not contain a redirects file.
            const basePath = path.join(__dirname, '../../../utils/fixtures/does-not-exist/');
            const redirectManager = new DynamicRedirectManager({
                permanentMaxAge: 100,
                getSubdirectoryURL: (pathname) => {
                    return `/ghost/${pathname}`;
                }
            });

            const customRedirectsAPI = new CustomRedirectsAPI({
                basePath
            }, redirectManager);

            const file = await customRedirectsAPI.get();

            should.deepEqual(file, []);
        });
    });
});
