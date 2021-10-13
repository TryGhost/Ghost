const should = require('should');
const models = require('../../../../core/server/models');

describe('Unit: models/custom-theme-setting', function () {
    before(function () {
        models.init();
    });

    describe('parse', function () {
        it('ensure correct parsing when fetching from db', function () {
            const setting = models.CustomThemeSetting.forge();

            let returns = setting.parse({theme: 'test', key: 'dark_mode', value: 'false', type: 'boolean'});
            should.equal(returns.value, false);

            returns = setting.parse({theme: 'test', key: 'dark_mode', value: false, type: 'boolean'});
            should.equal(returns.value, false);

            returns = setting.parse({theme: 'test', key: 'dark_mode', value: true, type: 'boolean'});
            should.equal(returns.value, true);

            returns = setting.parse({theme: 'test', key: 'dark_mode', value: 'true', type: 'boolean'});
            should.equal(returns.value, true);

            returns = setting.parse({theme: 'test', key: 'dark_mode', value: '0', type: 'boolean'});
            should.equal(returns.value, false);

            returns = setting.parse({theme: 'test', key: 'dark_mode', value: '1', type: 'boolean'});
            should.equal(returns.value, true);

            returns = setting.parse({theme: 'test', key: 'something', value: 'null', type: 'select'});
            should.equal(returns.value, 'null');
        });
    });

    describe('format', function () {
        it('ensure correct formatting when setting', function () {
            const setting = models.CustomThemeSetting.forge();

            let returns = setting.format({theme: 'test', key: 'dark_mode', value: '0', type: 'boolean'});
            should.equal(returns.value, 'false');

            returns = setting.format({theme: 'test', key: 'dark_mode', value: '1', type: 'boolean'});
            should.equal(returns.value, 'true');

            returns = setting.format({theme: 'test', key: 'dark_mode', value: 'false', type: 'boolean'});
            should.equal(returns.value, 'false');

            returns = setting.format({theme: 'test', key: 'dark_mode', value: 'true', type: 'boolean'});
            should.equal(returns.value, 'true');
        });
    });
});
