const sinon = require('sinon');
const CommentsService = require('../../../../../core/server/services/comments/comments-service');

// The admin moderation listing emits a `post` field per comment which is
// rendered through mappers/comments.js → url.forPost → urlService.facade.
// Under lazyRouting that needs the post's tags+authors loaded or every
// comment row's post URL is /404/ for tag-/author-filtered routes.

describe('CommentsService.getAdminAllComments lazyRouting URL relations', function () {
    let findPage;
    let service;

    beforeEach(function () {
        findPage = sinon.fake.resolves({data: [], meta: {}});
        service = new CommentsService({
            models: {Comment: {findPage}},
            // Other deps default to null/undefined; they're not exercised
            // by getAdminAllComments.
            config: null,
            logging: null,
            mailer: null,
            settingsCache: null,
            settingsHelpers: null,
            urlService: null,
            urlUtils: null,
            contentGating: null,
            labs: null
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('loads post.tags and post.authors so URL serialization can resolve filtered routes', async function () {
        await service.getAdminAllComments({
            includeNested: false,
            order: 'created_at desc',
            page: 1,
            limit: 10
        });

        sinon.assert.calledOnce(findPage);
        const opts = findPage.firstCall.args[0];
        const wr = opts.withRelated || [];
        sinon.assert.match(wr, sinon.match.array.contains(['post.tags']));
        sinon.assert.match(wr, sinon.match.array.contains(['post.authors']));
    });
});
