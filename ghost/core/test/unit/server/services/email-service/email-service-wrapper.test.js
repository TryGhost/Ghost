const assert = require('node:assert/strict');
const sinon = require('sinon');
const url = require('../../../../../core/server/api/endpoints/utils/serializers/output/utils/url');
const EmailServiceWrapper = require('../../../../../core/server/services/email-service/email-service-wrapper');

describe('EmailServiceWrapper getPostUrl', function () {
    afterEach(function () {
        sinon.restore();
    });

    function fakePost(type) {
        return {
            id: 'resource-id',
            toJSON: () => ({id: 'resource-id', slug: 'a-slug', status: 'published', type})
        };
    }

    it('routes a page as a page, not a post', function () {
        // The URL service routes by resource type; a page mis-typed as a post
        // matches no post collection and 404s.
        const forPost = sinon.stub(url, 'forPost');

        new EmailServiceWrapper().getPostUrl(fakePost('page'));

        assert.equal(forPost.getCall(0).args[3], 'pages');
    });

    it('routes a post as a post', function () {
        const forPost = sinon.stub(url, 'forPost');

        new EmailServiceWrapper().getPostUrl(fakePost('post'));

        assert.equal(forPost.getCall(0).args[3], 'posts');
    });
});

describe('EmailServiceWrapper getEmailProvider', function () {
    it('uses Mailgun when no email adapter is configured', function () {
        const mailgunClient = {};
        const errorHandler = () => {};
        const adapterManager = {getAdapter: () => assert.fail('adapter manager should not be called')};

        class MailgunEmailProvider {
            constructor(options) {
                this.options = options;
            }
        }

        const config = {get: () => undefined};
        const provider = new EmailServiceWrapper().getEmailProvider({
            config,
            adapterManager,
            MailgunEmailProvider,
            mailgunClient,
            errorHandler
        });

        assert.ok(provider instanceof MailgunEmailProvider);
        assert.deepEqual(provider.options, {mailgunClient, config, errorHandler});
    });

    it('resolves the configured email adapter instead of Mailgun', function () {
        const adapterInstance = {send: async () => {}};
        const adapterManager = {
            getAdapter(name) {
                assert.equal(name, 'email');
                return adapterInstance;
            }
        };

        const resolvedProvider = new EmailServiceWrapper().getEmailProvider({
            config: {get: () => ({active: 'ses'})},
            adapterManager,
            MailgunEmailProvider: class MailgunEmailProvider {},
            mailgunClient: {},
            errorHandler: () => {}
        });

        assert.equal(resolvedProvider, adapterInstance);
    });
});
