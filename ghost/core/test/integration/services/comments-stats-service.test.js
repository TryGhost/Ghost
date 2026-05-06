const assert = require('node:assert/strict');
const ObjectId = require('bson-objectid').default;
const testUtils = require('../../utils');
const CommentsStatsService = require('../../../core/server/services/comments/comments-stats-service');
const db = require('../../../core/server/data/db');

describe('CommentsStatsService', function () {
    before(testUtils.teardownDb);
    before(testUtils.setup('users:roles', 'posts', 'members'));

    beforeEach(async function () {
        await testUtils.truncate('comment_reports');
        await testUtils.truncate('comments');
    });

    const service = new CommentsStatsService({db});

    function post(index = 0) {
        return testUtils.DataGenerator.forKnex.posts[index];
    }

    function member(index = 0) {
        return testUtils.DataGenerator.forKnex.members[index];
    }

    async function addComment({postIndex = 0, memberIndex = 0, createdAt, status = 'published', html = '<p>Comment</p>'} = {}) {
        const id = ObjectId().toHexString();
        await db.knex('comments').insert({
            id,
            post_id: post(postIndex).id,
            member_id: member(memberIndex).id,
            html,
            status,
            created_at: createdAt,
            updated_at: createdAt
        });

        return {id};
    }

    async function addReport(comment, memberIndex = 1, createdAt) {
        await db.knex('comment_reports').insert({
            id: ObjectId().toHexString(),
            comment_id: comment.id,
            member_id: member(memberIndex).id,
            created_at: createdAt,
            updated_at: createdAt
        });
    }

    it('aggregates totals, previous totals, top posts and top members from real tables', async function () {
        await addComment({createdAt: '2026-04-29T10:00:00.000Z', memberIndex: 0});
        await addComment({createdAt: '2026-04-30T10:00:00.000Z', memberIndex: 1});

        const first = await addComment({createdAt: '2026-05-01T10:00:00.000Z', memberIndex: 0, postIndex: 0});
        const second = await addComment({createdAt: '2026-05-01T12:00:00.000Z', memberIndex: 0, postIndex: 0});
        await addComment({createdAt: '2026-05-02T10:00:00.000Z', memberIndex: 1, postIndex: 1});
        await addComment({createdAt: '2026-05-02T11:00:00.000Z', memberIndex: 2, postIndex: 1, status: 'hidden'});

        await addReport(first, 1, '2026-05-01T13:00:00.000Z');
        await addReport(first, 2, '2026-05-01T14:00:00.000Z');
        await addReport(second, 2, '2026-05-02T14:00:00.000Z');

        const result = await service.getOverview({
            dateFrom: '2026-05-01',
            dateTo: '2026-05-02',
            timezone: 'UTC'
        });

        assert.deepEqual(result.totals, {comments: 3, commenters: 2, reported: 2});
        assert.deepEqual(result.previousTotals, {comments: 2, commenters: 2, reported: 0});
        assert.deepEqual(result.series, [
            {date: '2026-05-01', count: 2, commenters: 1, reported: 1},
            {date: '2026-05-02', count: 1, commenters: 1, reported: 1}
        ]);
        assert.deepEqual(result.topPosts.map(item => ({id: item.id, count: item.count})), [
            {id: post(0).id, count: 2},
            {id: post(1).id, count: 1}
        ]);
        assert.deepEqual(result.topMembers.map(item => ({id: item.id, count: item.count})), [
            {id: member(0).id, count: 2},
            {id: member(1).id, count: 1}
        ]);
    });

    it('buckets series rows by the requested timezone', async function () {
        const comment = await addComment({
            createdAt: '2026-05-06T06:30:00.000Z',
            memberIndex: 0,
            postIndex: 0
        });
        await addReport(comment, 1, '2026-05-06T06:45:00.000Z');

        const result = await service.getOverview({
            dateFrom: '2026-05-05',
            dateTo: '2026-05-05',
            timezone: 'America/Los_Angeles'
        });

        assert.deepEqual(result.series, [
            {date: '2026-05-05', count: 1, commenters: 1, reported: 1}
        ]);
    });
});
