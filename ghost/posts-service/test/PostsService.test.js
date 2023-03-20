const {PostsService} = require('../index');
const assert = require('assert');

describe('Posts Service', function () {
    it('Can construct class', function () {
        new PostsService({});
    });

    describe('shouldSendEmail', function () {
        it('calculates if an email should be sent', async function () {
            const postsService = new PostsService({});

            assert.deepEqual([
                postsService.shouldSendEmail('published', 'draft'),
                postsService.shouldSendEmail('published', 'scheduled'),
                postsService.shouldSendEmail('sent', 'draft'),
                postsService.shouldSendEmail('sent', 'scheduled'),

                postsService.shouldSendEmail('published', 'published'),
                postsService.shouldSendEmail('published', 'sent'),
                postsService.shouldSendEmail('published', 'published'),
                postsService.shouldSendEmail('published', 'sent'),
                postsService.shouldSendEmail('sent', 'published'),
                postsService.shouldSendEmail('sent', 'sent'),
                postsService.shouldSendEmail()
            ], [
                true,
                true,
                true,
                true,

                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]);
        });
    });
});
