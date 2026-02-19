const assert = require('node:assert/strict');
const models = require('../../../../core/server/models');
const config = require('../../../../core/shared/config');

describe('Unit: models/custom-theme-setting', function () {
    before(function () {
        models.init();
    });

    describe('parse', function () {
        it('ensure correct parsing when fetching from db', function () {
            const setting = models.CustomThemeSetting.forge();

            let returns = setting.parse({theme: 'test', key: 'dark_mode', value: 'false', type: 'boolean'});
            assert.equal(returns.value, false);

            returns = setting.parse({theme: 'test', key: 'dark_mode', value: false, type: 'boolean'});
            assert.equal(returns.value, false);

            returns = setting.parse({theme: 'test', key: 'dark_mode', value: true, type: 'boolean'});
            assert.equal(returns.value, true);

            returns = setting.parse({theme: 'test', key: 'dark_mode', value: 'true', type: 'boolean'});
            assert.equal(returns.value, true);

            returns = setting.parse({theme: 'test', key: 'dark_mode', value: '0', type: 'boolean'});
            assert.equal(returns.value, false);

            returns = setting.parse({theme: 'test', key: 'dark_mode', value: '1', type: 'boolean'});
            assert.equal(returns.value, true);

            returns = setting.parse({theme: 'test', key: 'something', value: 'null', type: 'select'});
            assert.equal(returns.value, 'null');

            returns = setting.parse({theme: 'test', key: 'something', value: '__GHOST_URL__/assets/image.jpg', type: 'image'});
            assert.equal(returns.value, `${config.get('url')}/assets/image.jpg`);
        });
    });

    describe('format', function () {
        it('ensure correct formatting when setting', function () {
            const setting = models.CustomThemeSetting.forge();

            let returns = setting.format({theme: 'test', key: 'dark_mode', value: '0', type: 'boolean'});
            assert.equal(returns.value, 'false');

            returns = setting.format({theme: 'test', key: 'dark_mode', value: '1', type: 'boolean'});
            assert.equal(returns.value, 'true');

            returns = setting.format({theme: 'test', key: 'dark_mode', value: 'false', type: 'boolean'});
            assert.equal(returns.value, 'false');

            returns = setting.format({theme: 'test', key: 'dark_mode', value: 'true', type: 'boolean'});
            assert.equal(returns.value, 'true');
        });

        it('transforms urls when persisting to db', function () {
            const setting = models.CustomThemeSetting.forge();

            let returns = setting.formatOnWrite({theme: 'test', key: 'something', value: '/assets/image.jpg', type: 'image'});
            assert.equal(returns.value, '__GHOST_URL__/assets/image.jpg');
        });
    });
});
