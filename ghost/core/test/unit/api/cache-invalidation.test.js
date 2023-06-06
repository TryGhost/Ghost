const assert = require('assert');
const path = require('path');

const glob = require('glob');

const models = require('../../../core/server/models');
const settings = require('../../../core/server/services/settings/settings-service');

describe('Cache Invalidation', function () {
    before(async function () {
        // Initialise models - Utilised by various endpoints to reference static fields (i.e models.Post.allowedFormats) when required in
        models.init();

        // Initialise settings cache - Utilised by the indentites endpoint when required in
        await settings.init();
    });

    it('Controller actions explicitly declare cacheInvalidate header', async function () {
        const endpointPaths = glob.sync('*.js', {
            cwd: path.join(__dirname, '../../../core/server/api/endpoints'),
            ignore: ['index.js'],
            realpath: true
        });

        endpointPaths.forEach((endpointPath) => {
            const endpointConfig = require(endpointPath);
            const ignoreKeys = ['docName'];

            Object.keys(endpointConfig).forEach((key) => {
                if (ignoreKeys.includes(key) || typeof endpointConfig[key] === 'function') {
                    return;
                }

                assert.notEqual(
                    endpointConfig[key].headers?.cacheInvalidate,
                    undefined,
                    `"${key}" action in controller: ${endpointPath} is missing cacheInvalidate header - This needs to be explicitly defined`
                );
            });
        });
    });
});
