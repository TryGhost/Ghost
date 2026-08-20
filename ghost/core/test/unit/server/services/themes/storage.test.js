const assert = require('node:assert/strict');
const storage = require('../../../../../core/server/services/themes/storage');

describe('Themes storage', function () {
    describe('zipToFile', function () {
        it('rejects a theme that is not installed', async function () {
            await assert.rejects(
                storage.zipToFile('not-installed', '/tmp/not-installed.zip'),
                {name: 'BadRequestError'}
            );
        });
    });
});
