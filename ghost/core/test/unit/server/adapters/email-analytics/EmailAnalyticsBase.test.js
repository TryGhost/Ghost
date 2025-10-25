const should = require('should');
const EmailAnalyticsBase = require('../../../../../core/server/adapters/email-analytics/EmailAnalyticsBase');

describe('EmailAnalyticsBase', function () {
    describe('Constructor', function () {
        it('should set requiredFns', function () {
            const base = new EmailAnalyticsBase();

            should.exist(base.requiredFns);
            base.requiredFns.should.be.an.Array();
            base.requiredFns.should.containEql('fetchLatest');
        });

        it('should store config', function () {
            const testConfig = {
                someKey: 'someValue'
            };
            const base = new EmailAnalyticsBase(testConfig);

            base.config.should.equal(testConfig);
        });

        it('should handle missing config', function () {
            const base = new EmailAnalyticsBase();

            base.config.should.deepEqual({});
        });
    });

    describe('fetchLatest()', function () {
        it('should exist', function () {
            const base = new EmailAnalyticsBase();

            should.exist(base.fetchLatest);
            base.fetchLatest.should.be.a.Function();
        });

        it('should throw error when not implemented', async function () {
            const base = new EmailAnalyticsBase();

            try {
                await base.fetchLatest();
                throw new Error('Should have thrown an error');
            } catch (err) {
                err.name.should.equal('IncorrectUsageError');
                err.message.should.match(/fetchLatest\(\) must be implemented/);
            }
        });
    });

    describe('AdapterManager integration', function () {
        it('can be required', function () {
            const BaseClass = require('../../../../../core/server/adapters/email-analytics/EmailAnalyticsBase');

            should.exist(BaseClass);
        });

        it('can be instantiated', function () {
            const BaseClass = require('../../../../../core/server/adapters/email-analytics/EmailAnalyticsBase');
            const instance = new BaseClass({});

            should.exist(instance);
            instance.should.be.instanceOf(BaseClass);
        });
    });
});
