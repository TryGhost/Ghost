const should = require('should');
const models = require('../../../server/models');

describe('Unit: models/settings', function () {
    before(function () {
        models.init();
    });

    describe('parse', function () {
        it('ensure correct parsing when fetching from db', function () {
            const setting = models.Settings.forge();

            let returns = setting.parse({key: 'is_private', value: 'false'});
            should.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: false});
            should.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: true});
            should.equal(returns.value, true);

            returns = setting.parse({key: 'is_private', value: 'true'});
            should.equal(returns.value, true);

            returns = setting.parse({key: 'is_private', value: '0'});
            should.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: '1'});
            should.equal(returns.value, true);

            returns = setting.parse({key: 'something', value: 'null'});
            should.equal(returns.value, null);
        });
    });
});
