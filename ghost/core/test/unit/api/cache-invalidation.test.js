const assert = require('assert/strict');
const path = require('path');

const glob = require('glob');

const models = require('../../../core/server/models');

describe('API', function () {
    describe('Cache Invalidation', function () {
        before(async function () {
            // Initialise models - Utilised by various endpoints to reference static fields (i.e models.Post.allowedFormats) when required in
            models.init();
        });

        it('Controller actions explicitly declare cacheInvalidate header', async function () {
            const controllersRootPath = path.join(__dirname, '../../../core/server/api/endpoints');
            const controllerPaths = glob.sync('*.js', {
                cwd: controllersRootPath,
                ignore: [
                    'index.js',
                    'identities.js' // The identities controller can not be required directly due to requiring other parts of Ghost to have been initialised first
                ],
                realpath: true
            });

            assert.ok(controllerPaths.length > 0, `No controllers found in ${controllersRootPath}`);

            controllerPaths.forEach((controllerPath) => {
                const controllerConfig = require(controllerPath);
                const ignoreKeys = ['docName'];

                Object.keys(controllerConfig).forEach((key) => {
                    if (ignoreKeys.includes(key) || typeof controllerConfig[key] === 'function') {
                        return;
                    }

                    assert.notEqual(
                        controllerConfig[key].headers?.cacheInvalidate,
                        undefined,
                        `"${key}" action in controller: ${controllerPath} is missing cacheInvalidate header - This needs to be explicitly defined`
                    );
                });
            });
        });
    });
});
