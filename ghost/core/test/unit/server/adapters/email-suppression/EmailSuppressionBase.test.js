const should = require('should');
const EmailSuppressionBase = require('../../../../../core/server/adapters/email-suppression/EmailSuppressionBase');

describe('EmailSuppressionBase', function () {
    describe('Constructor', function () {
        it('should set requiredFns', function () {
            const base = new EmailSuppressionBase();

            should.exist(base.requiredFns);
            base.requiredFns.should.be.an.Array();
            base.requiredFns.should.containEql('getSuppressionData');
            base.requiredFns.should.containEql('getBulkSuppressionData');
            base.requiredFns.should.containEql('removeEmail');
        });

        it('should have immutable requiredFns', function () {
            const base = new EmailSuppressionBase();

            const originalFns = base.requiredFns;
            try {
                base.requiredFns = ['somethingElse'];
            } catch (err) {
                // Expected - property is read-only
            }

            base.requiredFns.should.equal(originalFns);
        });

        it('should store config', function () {
            const testConfig = {
                someKey: 'someValue'
            };
            const base = new EmailSuppressionBase(testConfig);

            base.config.should.equal(testConfig);
        });

        it('should handle missing config', function () {
            const base = new EmailSuppressionBase();

            base.config.should.deepEqual({});
        });
    });

    describe('getSuppressionData()', function () {
        it('should exist', function () {
            const base = new EmailSuppressionBase();

            should.exist(base.getSuppressionData);
            base.getSuppressionData.should.be.a.Function();
        });

        it('should throw error when not implemented', async function () {
            const base = new EmailSuppressionBase();

            try {
                await base.getSuppressionData('test@example.com');
                throw new Error('Should have thrown an error');
            } catch (err) {
                err.name.should.equal('IncorrectUsageError');
                err.message.should.match(/getSuppressionData\(\) must be implemented/);
            }
        });
    });

    describe('getBulkSuppressionData()', function () {
        it('should exist', function () {
            const base = new EmailSuppressionBase();

            should.exist(base.getBulkSuppressionData);
            base.getBulkSuppressionData.should.be.a.Function();
        });

        it('should throw error when not implemented', async function () {
            const base = new EmailSuppressionBase();

            try {
                await base.getBulkSuppressionData(['test@example.com']);
                throw new Error('Should have thrown an error');
            } catch (err) {
                err.name.should.equal('IncorrectUsageError');
                err.message.should.match(/getBulkSuppressionData\(\) must be implemented/);
            }
        });
    });

    describe('removeEmail()', function () {
        it('should exist', function () {
            const base = new EmailSuppressionBase();

            should.exist(base.removeEmail);
            base.removeEmail.should.be.a.Function();
        });

        it('should throw error when not implemented', async function () {
            const base = new EmailSuppressionBase();

            try {
                await base.removeEmail('test@example.com');
                throw new Error('Should have thrown an error');
            } catch (err) {
                err.name.should.equal('IncorrectUsageError');
                err.message.should.match(/removeEmail\(\) must be implemented/);
            }
        });
    });

    describe('AdapterManager integration', function () {
        it('can be required', function () {
            const BaseClass = require('../../../../../core/server/adapters/email-suppression/EmailSuppressionBase');

            should.exist(BaseClass);
        });

        it('can be instantiated', function () {
            const BaseClass = require('../../../../../core/server/adapters/email-suppression/EmailSuppressionBase');
            const instance = new BaseClass({});

            should.exist(instance);
            instance.should.be.instanceOf(BaseClass);
        });
    });
});
