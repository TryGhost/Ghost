const assert = require('assert/strict');
const {agentProvider, mockManager, fixtureManager, dbUtils} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const settingsCache = require('../../../core/shared/settings-cache');
const sinon = require('sinon');
const cursorUtils = require('../../../core/server/services/comments/cursor-utils');

let membersAgent, postId;

const dbFns = {
    addComment: async (data) => {
        return await models.Comment.add({
            post_id: data.post_id || postId,
            member_id: data.member_id,
            parent_id: data.parent_id,
            html: data.html || '<p>This is a comment</p>',
            created_at: data.created_at,
            status: data.status || 'published'
        });
    },
    addLike: async (data) => {
        return await models.CommentLike.add({
            comment_id: data.comment_id,
            member_id: data.member_id
        });
    }
};

describe('Comments Cursor Pagination API', function () {
    before(async function () {
        membersAgent = await agentProvider.getMembersAPIAgent();
        await fixtureManager.init('posts', 'members');
        postId = fixtureManager.get('posts', 0).id;
    });

    beforeEach(async function () {
        mockManager.mockMail();

        const getStub = sinon.stub(settingsCache, 'get');
        getStub.callsFake((key, options) => {
            if (key === 'comments_enabled') {
                return 'all';
            }
            return getStub.wrappedMethod.call(settingsCache, key, options);
        });

        await dbUtils.truncate('comments');
        await dbUtils.truncate('comment_likes');
        await dbUtils.truncate('comment_reports');
    });

    afterEach(async function () {
        sinon.restore();
        mockManager.restore();
    });

    describe('Cursor-based browse', function () {
        it('Treats invalid cursor gracefully (returns first page)', async function () {
            const memberId = fixtureManager.get('members', 0).id;

            await dbFns.addComment({
                member_id: memberId,
                html: '<p>Comment 1</p>'
            });

            // Invalid cursor string should be treated as "no cursor" (first page)
            const result = await membersAgent
                .get(`/api/comments/post/${postId}/?limit=10&after=invalidcursor`)
                .expectStatus(200);

            assert.equal(result.body.comments.length, 1);
        });

        it('Can paginate forward using after cursor', async function () {
            const memberId = fixtureManager.get('members', 0).id;

            // Create 5 comments with distinct timestamps
            const comments = [];
            for (let i = 0; i < 5; i++) {
                const comment = await dbFns.addComment({
                    member_id: memberId,
                    html: `<p>Comment ${i}</p>`,
                    created_at: new Date(Date.now() - (4 - i) * 100000)
                });
                comments.push(comment);
            }

            // Default order is created_at DESC, so newest first: 4, 3, 2, 1, 0
            // Build a cursor from the 3rd comment (Comment 2) which is at position 2 in DESC order
            const thirdComment = comments[2]; // Comment 2, middle in DESC order

            const cursor = cursorUtils.encodeCursor({
                created_at: thirdComment.get('created_at').toISOString(),
                id: thirdComment.id
            });

            // Get items after this cursor (should get Comment 1 and Comment 0)
            const result = await membersAgent
                .get(`/api/comments/post/${postId}/?limit=10&after=${cursor}`)
                .expectStatus(200);

            assert.equal(result.body.comments.length, 2);
            // Verify cursor pagination metadata
            assert.equal(result.body.meta.pagination.page, null);
            assert.equal(result.body.meta.pagination.pages, null);
            assert.equal(result.body.meta.pagination.total, 5);
            // No more after these
            assert.equal(result.body.meta.pagination.next, null);
            // There should be a prev cursor
            assert.ok(result.body.meta.pagination.prev);
        });

        it('Returns next cursor when there are more items', async function () {
            const memberId = fixtureManager.get('members', 0).id;

            // Create 5 comments
            const comments = [];
            for (let i = 0; i < 5; i++) {
                const comment = await dbFns.addComment({
                    member_id: memberId,
                    html: `<p>Comment ${i}</p>`,
                    created_at: new Date(Date.now() - (4 - i) * 100000)
                });
                comments.push(comment);
            }

            // Get only the first comment (newest: Comment 4), use cursor from it
            const newestComment = comments[4];
            const cursor = cursorUtils.encodeCursor({
                created_at: newestComment.get('created_at').toISOString(),
                id: newestComment.id
            });

            // Get 2 items after the newest comment
            const result = await membersAgent
                .get(`/api/comments/post/${postId}/?limit=2&after=${cursor}`)
                .expectStatus(200);

            assert.equal(result.body.comments.length, 2);
            // There are more items (2 out of 4 remaining), so next should be set
            assert.ok(result.body.meta.pagination.next, 'Should have a next cursor');
        });

        it('Returns empty result when cursor is past all items', async function () {
            const memberId = fixtureManager.get('members', 0).id;

            await dbFns.addComment({
                member_id: memberId,
                html: '<p>Only comment</p>'
            });

            // Cursor that points before all items (very old date, for DESC order)
            const cursor = cursorUtils.encodeCursor({
                created_at: '2000-01-01T00:00:00.000Z',
                id: '000000000000000000000000'
            });

            const result = await membersAgent
                .get(`/api/comments/post/${postId}/?limit=10&after=${cursor}`)
                .expectStatus(200);

            assert.equal(result.body.comments.length, 0);
            assert.equal(result.body.meta.pagination.next, null);
            assert.equal(result.body.meta.pagination.prev, null);
        });
    });

    describe('Anchor resolution', function () {
        it('Can load comments around an anchor', async function () {
            const memberId = fixtureManager.get('members', 0).id;

            // Create 10 comments
            const comments = [];
            for (let i = 0; i < 10; i++) {
                const comment = await dbFns.addComment({
                    member_id: memberId,
                    html: `<p>Comment ${i}</p>`,
                    created_at: new Date(Date.now() - (9 - i) * 100000)
                });
                comments.push(comment);
            }

            // Anchor on the 5th comment
            const anchorId = comments[4].id;

            const result = await membersAgent
                .get(`/api/comments/post/${postId}/?limit=5&anchor=${anchorId}`)
                .expectStatus(200);

            // Should have anchor metadata
            assert.ok(result.body.meta.anchor);
            assert.equal(result.body.meta.anchor.id, anchorId);
            assert.equal(result.body.meta.anchor.found, true);

            // Should have cursor pagination metadata
            assert.equal(result.body.meta.pagination.page, null);

            // The anchor comment should be in the results
            const anchorInResults = result.body.comments.some(c => c.id === anchorId);
            assert.ok(anchorInResults, 'Anchor comment should be in the results');
        });

        it('Falls back to first page when anchor not found', async function () {
            const memberId = fixtureManager.get('members', 0).id;

            await dbFns.addComment({
                member_id: memberId,
                html: '<p>Some comment</p>'
            });

            const fakeAnchorId = '000000000000000000000000';

            const result = await membersAgent
                .get(`/api/comments/post/${postId}/?limit=5&anchor=${fakeAnchorId}`)
                .expectStatus(200);

            assert.ok(result.body.meta.anchor);
            assert.equal(result.body.meta.anchor.id, fakeAnchorId);
            assert.equal(result.body.meta.anchor.found, false);

            // Should still return comments (first page)
            assert.ok(result.body.comments.length > 0);
        });
    });

    describe('Backward compatibility', function () {
        it('Page-based requests still work normally', async function () {
            const memberId = fixtureManager.get('members', 0).id;

            for (let i = 0; i < 5; i++) {
                await dbFns.addComment({
                    member_id: memberId,
                    html: `<p>Comment ${i}</p>`,
                    created_at: new Date(Date.now() - (4 - i) * 100000)
                });
            }

            const result = await membersAgent
                .get(`/api/comments/post/${postId}/?page=1&limit=3`)
                .expectStatus(200);

            assert.equal(result.body.comments.length, 3);
            assert.equal(result.body.meta.pagination.page, 1);
            assert.equal(result.body.meta.pagination.pages, 2);
            assert.equal(result.body.meta.pagination.total, 5);
        });
    });

    describe('Sort orders with cursors', function () {
        it('Works with oldest first (ASC) order', async function () {
            const memberId = fixtureManager.get('members', 0).id;

            const comments = [];
            for (let i = 0; i < 5; i++) {
                const comment = await dbFns.addComment({
                    member_id: memberId,
                    html: `<p>Comment ${i}</p>`,
                    created_at: new Date(Date.now() - (4 - i) * 100000)
                });
                comments.push(comment);
            }

            // In ASC order: 0, 1, 2, 3, 4 (oldest first)
            // Create cursor from Comment 1 (2nd oldest)
            const secondOldest = comments[1];
            const cursor = cursorUtils.encodeCursor({
                created_at: secondOldest.get('created_at').toISOString(),
                id: secondOldest.id
            });

            // Items after Comment 1 in ASC order should be 2, 3, 4
            const result = await membersAgent
                .get(`/api/comments/post/${postId}/?limit=10&order=created_at%20ASC%2C%20id%20ASC&after=${cursor}`)
                .expectStatus(200);

            assert.equal(result.body.comments.length, 3);
            assert.ok(result.body.comments[0].html.includes('Comment 2'));
            assert.ok(result.body.comments[1].html.includes('Comment 3'));
            assert.ok(result.body.comments[2].html.includes('Comment 4'));
        });
    });

    describe('Reply cursor pagination', function () {
        it('Can paginate replies with cursors', async function () {
            const memberId = fixtureManager.get('members', 0).id;
            const memberId2 = fixtureManager.get('members', 1).id;

            // Create parent comment
            const parent = await dbFns.addComment({
                member_id: memberId,
                html: '<p>Parent comment</p>'
            });

            // Create 5 replies with distinct timestamps
            const replies = [];
            for (let i = 0; i < 5; i++) {
                const reply = await dbFns.addComment({
                    member_id: memberId2,
                    parent_id: parent.id,
                    html: `<p>Reply ${i}</p>`,
                    created_at: new Date(Date.now() - (4 - i) * 100000)
                });
                replies.push(reply);
            }

            // Replies default to created_at ASC (oldest first): 0, 1, 2, 3, 4
            // Create cursor from Reply 1 (2nd oldest)
            const secondReply = replies[1];
            const cursor = cursorUtils.encodeCursor({
                created_at: secondReply.get('created_at').toISOString(),
                id: secondReply.id
            });

            // Items after Reply 1 in ASC order should be Reply 2, 3, 4
            const result = await membersAgent
                .get(`/api/comments/${parent.id}/replies/?limit=10&after=${cursor}`)
                .expectStatus(200);

            assert.equal(result.body.comments.length, 3);
            assert.equal(result.body.meta.pagination.page, null);
            assert.ok(result.body.comments[0].html.includes('Reply 2'));
            assert.ok(result.body.comments[1].html.includes('Reply 3'));
            assert.ok(result.body.comments[2].html.includes('Reply 4'));
        });
    });
});
