const should = require('should');
const EmailProviderBase = require('../../../../../core/server/adapters/email/EmailProviderBase');

describe('EmailProviderBase', function () {
    describe('constructor', function () {
        it('sets requiredFns property', function () {
            const base = new EmailProviderBase({});

            should.exist(base.requiredFns);
            base.requiredFns.should.be.an.Array();
            base.requiredFns.should.containEql('send');
        });

        it('stores config', function () {
            const config = {domain: 'test.com', apiKey: 'key-123'};
            const base = new EmailProviderBase(config);

            should.exist(base.config);
            base.config.should.equal(config);
        });

        it('handles missing config', function () {
            const base = new EmailProviderBase();

            should.exist(base.config);
            base.config.should.eql({});
        });
    });

    describe('send method', function () {
        it('is defined', function () {
            const base = new EmailProviderBase({});

            base.send.should.be.a.Function();
        });

        it('throws error when not implemented', async function () {
            const base = new EmailProviderBase({});
            const emailData = {
                subject: 'Test',
                html: '<p>Test</p>',
                plaintext: 'Test',
                recipients: [{email: 'test@example.com'}]
            };

            await base.send(emailData).should.be.rejected();
        });

        it('throws error with descriptive message', async function () {
            const base = new EmailProviderBase({});

            try {
                await base.send({});
                should.fail('Should have thrown an error');
            } catch (error) {
                error.message.should.match(/send\(\) must be implemented by email provider adapter/);
            }
        });
    });

    describe('module exports', function () {
        it('can be required', function () {
            const BaseClass = require('../../../../../core/server/adapters/email/EmailProviderBase');

            should.exist(BaseClass);
            BaseClass.should.be.a.Function();
        });

        it('can be instantiated', function () {
            const BaseClass = require('../../../../../core/server/adapters/email/EmailProviderBase');
            const instance = new BaseClass({});

            should.exist(instance);
            instance.should.be.instanceOf(EmailProviderBase);
        });
    });
});
