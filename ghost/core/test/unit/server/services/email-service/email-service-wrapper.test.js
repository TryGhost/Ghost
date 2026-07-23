const assert = require('node:assert/strict');
const EmailServiceWrapper = require('../../../../../core/server/services/email-service/email-service-wrapper');

describe('UNIT: EmailServiceWrapper', function () {
    it('uses Mailgun when no email adapter is configured', function () {
        const mailgunClient = {};
        const errorHandler = () => {};
        const adapterManager = {getAdapter: () => assert.fail('adapter manager should not be called')};

        class MailgunEmailProvider {
            constructor(options) {
                this.options = options;
            }
        }

        const provider = new EmailServiceWrapper().getEmailProvider({
            config: {get: () => undefined},
            adapterManager,
            MailgunEmailProvider,
            mailgunClient,
            errorHandler
        });

        assert.ok(provider instanceof MailgunEmailProvider);
        assert.deepEqual(provider.options, {mailgunClient, errorHandler});
    });

    it('resolves the configured email adapter', function () {
        const provider = {send: async () => {}};
        const adapterManager = {
            getAdapter(name) {
                assert.equal(name, 'email');
                return provider;
            }
        };

        const resolvedProvider = new EmailServiceWrapper().getEmailProvider({
            config: {get: () => ({active: 'ses'})},
            adapterManager,
            MailgunEmailProvider: class MailgunEmailProvider {},
            mailgunClient: {},
            errorHandler: () => {}
        });

        assert.equal(resolvedProvider, provider);
    });
});
