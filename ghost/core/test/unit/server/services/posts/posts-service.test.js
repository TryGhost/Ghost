const should = require('should');

const {PostsService} = require('../../../../../core/server/services/posts/posts-service');

describe('PostsService', function () {
    describe('shouldSendEmail', function () {
        it('calculates if an email should be sent', async function () {
            const postsService = new PostsService({});

            postsService.shouldSendEmail('published', 'draft').should.be.true();
            postsService.shouldSendEmail('published', 'scheduled').should.be.true();
            postsService.shouldSendEmail('sent', 'draft').should.be.true();
            postsService.shouldSendEmail('sent', 'scheduled').should.be.true();

            postsService.shouldSendEmail('published', 'published').should.be.false();
            postsService.shouldSendEmail('published', 'sent').should.be.false();
            postsService.shouldSendEmail('published', 'published').should.be.false();
            postsService.shouldSendEmail('published', 'sent').should.be.false();
            postsService.shouldSendEmail('sent', 'published').should.be.false();
            postsService.shouldSendEmail('sent', 'sent').should.be.false();

            postsService.shouldSendEmail().should.be.false();
        });
    });
});
