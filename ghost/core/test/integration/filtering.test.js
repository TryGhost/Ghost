const assert = require('node:assert/strict');
const testUtils = require('../utils');
const models = require('../../core/server/models');

/**
 * Behavioural coverage for NQL filter formats against Ghost's real model +
 * bookshelf-filter + mongo-knex pipeline. Asserts the records a filter returns,
 * not the SQL it generates, so it stays decoupled from query implementation
 * details. Posts + tags is used as a neutral many-to-many vehicle.
 */
describe('Filtering', function () {
    before(testUtils.teardownDb);
    before(testUtils.setup('users:roles'));

    before(async function () {
        const tag = (slug, name) => models.Tag.add({slug, name}, testUtils.context.internal);

        await tag('filtering-a', 'Filtering A');
        await tag('filtering-b', 'Filtering B');

        const post = (slug, tags) => models.Post.add(
            testUtils.DataGenerator.forKnex.createPost({
                slug,
                title: slug,
                status: 'published',
                tags: tags.map(t => ({slug: t}))
            }),
            testUtils.context.internal
        );

        await post('has-both', ['filtering-a', 'filtering-b']);
        await post('has-a', ['filtering-a']);
        await post('has-b', ['filtering-b']);
    });

    after(testUtils.teardownDb);

    async function filteredSlugs(filter) {
        const page = await models.Post.findPage({filter, withRelated: ['tags']});
        return page.data.map(post => post.get('slug')).sort();
    }

    describe('many-to-many relation operators', function () {
        it('all of (tags:[a+b]) returns only records that have every value', async function () {
            assert.deepEqual(await filteredSlugs('tags:[filtering-a+filtering-b]'), ['has-both']);
        });

        it('any of (tags:[a,b]) returns records that have any value', async function () {
            assert.deepEqual(await filteredSlugs('tags:[filtering-a,filtering-b]'), ['has-a', 'has-b', 'has-both']);
        });

        it('none of (tags:-[a,b]) excludes records that have any value', async function () {
            const slugs = await filteredSlugs('tags:-[filtering-a,filtering-b]');

            assert.ok(!['has-a', 'has-b', 'has-both'].some(slug => slugs.includes(slug)));
        });
    });
});
