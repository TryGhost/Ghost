const assert = require('node:assert/strict');
const testUtils = require('../../utils');
const models = require('../../../core/server/models');

const context = testUtils.context.owner;
const markdownToMobiledoc = testUtils.DataGenerator.markdownToMobiledoc;

// Regression test for https://github.com/TryGhost/Ghost/issues/23441
// On SQLite an absolute ISO date in a filter used to sort after the stored
// "YYYY-MM-DD HH:MM:SS" format (because "T" > " "), returning the wrong rows.
describe('Integration: Post date filtering', function () {
    const early = new Date(Date.UTC(2025, 5, 15, 9, 0, 0)); // same day, before the boundary
    const late = new Date(Date.UTC(2025, 5, 15, 12, 0, 0)); // same day, after the boundary
    const later = new Date(Date.UTC(2025, 11, 31, 23, 0, 0)); // a later day

    const addPost = (title, publishedAt) => models.Post.add({
        status: 'published',
        title,
        published_at: publishedAt,
        mobiledoc: markdownToMobiledoc('content')
    }, context);

    beforeAll(testUtils.teardownDb);
    beforeAll(testUtils.setup('users:roles'));
    beforeAll(async function () {
        await addPost('early-same-day', early);
        await addPost('late-same-day', late);
        await addPost('later-day', later);
    });
    afterAll(testUtils.teardownDb);

    const titlesFor = async (filter) => {
        const result = await models.Post.findPage({filter, status: 'all'});
        return result.data.map(post => post.get('title')).sort();
    };

    it('includes a same-day post that is after a "greater than" ISO boundary', async function () {
        // Boundary is 2025-06-15 10:00:00 UTC. "late-same-day" (12:00) is after it.
        const titles = await titlesFor("published_at:>'2025-06-15T10:00:00.000Z'");

        assert.deepEqual(titles, ['late-same-day', 'later-day']);
    });

    it('excludes a same-day post that is before a "less than" ISO boundary', async function () {
        // Boundary is 2025-06-15 10:00:00 UTC. Only "early-same-day" (09:00) is before it.
        const titles = await titlesFor("published_at:<'2025-06-15T10:00:00.000Z'");

        assert.deepEqual(titles, ['early-same-day']);
    });

    it('handles an ISO boundary with a timezone offset', async function () {
        // 2025-06-15T05:00:00-05:00 is 2025-06-15 10:00:00 UTC, same boundary as above.
        const titles = await titlesFor("published_at:>'2025-06-15T05:00:00.000-05:00'");

        assert.deepEqual(titles, ['late-same-day', 'later-day']);
    });
});
