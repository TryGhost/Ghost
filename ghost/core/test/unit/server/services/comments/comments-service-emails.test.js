const should = require('should');
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
        it('returns post URL with comment permalink when commentPermalinks lab flag is enabled', function () {
            const {instance} = createClassInstance({
                labs: {commentPermalinks: true}
            });

            const result = instance.getPostUrl('123', '456');

            should(result).equal('https://example.com/my-post/#ghost-comments-456');
        });

        it('returns post URL with ghost-comments-root when commentPermalinks lab flag is disabled', function () {
            const {instance} = createClassInstance({
                labs: {commentPermalinks: false}
            });

            const result = instance.getPostUrl('123', '456');

            should(result).equal('https://example.com/my-post/#ghost-comments-root');
        });
    });
});
