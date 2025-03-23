const should = require('should');
const {getFrontendAppConfig, getDataAttributes} = require('../../../../core/frontend/utils/frontend-apps');
const configUtils = require('../../../utils/configUtils');

describe('Frontend apps:', function () {
    describe('getFrontendAppConfig', function () {
        before(function () {
            configUtils.set({'portal:url': 'https://cdn.example.com/~{version}/portal.min.js'});
            configUtils.set({'portal:version': '1.0'});
            configUtils.set({'portal:styles': 'https://cdn.example.com/~{version}/main.css'});
        });

        after(async function () {
            await configUtils.restore();
        });

        it('should return app urls and version from config', async function () {
            const {stylesUrl, scriptUrl, appVersion} = getFrontendAppConfig('portal');
            should.equal(appVersion, '1.0');
            should.equal(stylesUrl, 'https://cdn.example.com/~1.0/main.css');
            should.equal(scriptUrl, 'https://cdn.example.com/~1.0/portal.min.js');
        });
    });

    describe('getDataAttributes', function () {
        it('should generate data attributes string from object', async function () {
            const dataAttributes = getDataAttributes({
                admin: 'test',
                'example-version': '1.0'
            });

            should.equal(dataAttributes, 'data-admin="test" data-example-version="1.0"');
        });

        it('should generate empty string for missing data object', async function () {
            const dataAttributes = getDataAttributes();

            should.equal(dataAttributes, '');
        });
    });
});
