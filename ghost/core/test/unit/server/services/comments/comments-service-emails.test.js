const assert = require('node:assert/strict');
const sinon = require('sinon');
const CommentsServiceEmails = require('../../../../../core/server/services/comments/comments-service-emails');

describe('Comments Service: CommentsServiceEmails', function () {
    function createClassInstance({labs = {}}) {
        const urlService = {
            getUrlByResourceId: sinon.stub().returns('https://example.com/my-post/')
        };
        const labsStub = {
            isSet: sinon.stub().callsFake(flag => labs[flag] || false)
        };

        const instance = new CommentsServiceEmails({
            config: {},
            logging: {},
            models: {},
            mailer: {},
            settingsCache: {get: sinon.stub()},
            settingsHelpers: {},
            urlService,
            urlUtils: {},
            labs: labsStub
        });

        return {instance, urlService};
    }

    describe('getPostUrl', function () {
        it('returns post URL with comment permalink', function () {
            const {instance} = createClassInstance({});

            const result = instance.getPostUrl('123', '456');

            assert.equal(result, 'https://example.com/my-post/#ghost-comments-456');
        });
    });
});
