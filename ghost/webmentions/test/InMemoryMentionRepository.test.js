const assert = require('assert/strict');
const ObjectID = require('bson-objectid');
const InMemoryMentionRepository = require('../lib/InMemoryMentionRepository');
const Mention = require('../lib/Mention');

describe('InMemoryMentionRepository', function () {
    it('Can handle filtering on resourceId', async function () {
        const resourceId = new ObjectID();
        const repository = new InMemoryMentionRepository();

        const validInput = {
            source: 'https://source.com',
            target: 'https://target.com',
            sourceTitle: 'Title!',
            sourceExcerpt: 'Excerpt!'
        };

        const mentions = await Promise.all([
            Mention.create(validInput),
            Mention.create({
                ...validInput,
                resourceId
            }),
            Mention.create({
                ...validInput,
                resourceId
            }),
            Mention.create(validInput),
            Mention.create({
                ...validInput,
                resourceId
            }),
            Mention.create({
                ...validInput,
                resourceId
            }),
            Mention.create(validInput),
            Mention.create({
                ...validInput,
                resourceId
            }),
            Mention.create(validInput)
        ]);

        for (const mention of mentions) {
            await repository.save(mention);
        }

        const pageOne = await repository.getPage({
            filter: `resource_id:${resourceId.toHexString()}`,
            limit: 2,
            page: 1
        });
        assert(pageOne.meta.pagination.total === 5);
        assert(pageOne.meta.pagination.pages === 3);
        assert(pageOne.meta.pagination.prev === null);
        assert(pageOne.meta.pagination.next === 2);

        const pageTwo = await repository.getPage({
            filter: `resource_id:${resourceId.toHexString()}`,
            limit: 2,
            page: 2
        });
        assert(pageTwo.meta.pagination.total === 5);
        assert(pageTwo.meta.pagination.pages === 3);
        assert(pageTwo.meta.pagination.prev === 1);
        assert(pageTwo.meta.pagination.next === 3);

        const pageThree = await repository.getPage({
            filter: `resource_id:${resourceId.toHexString()}`,
            limit: 2,
            page: 3
        });
        assert(pageThree.meta.pagination.total === 5);
        assert(pageThree.meta.pagination.pages === 3);
        assert(pageThree.meta.pagination.prev === 2);
        assert(pageThree.meta.pagination.next === null);
    });

    describe(`GetPage`, function () {
        it(`Doesn't return deleted mentions`, async function () {
            const repository = new InMemoryMentionRepository();

            const validInput = {
                source: 'https://source.com',
                target: 'https://target.com',
                sourceTitle: 'Title!',
                sourceExcerpt: 'Excerpt!'
            };

            const mentions = await Promise.all([
                Mention.create(validInput),
                Mention.create(validInput)
            ]);

            for (const mention of mentions) {
                await repository.save(mention);
            }

            const pageOne = await repository.getPage({page: 1, limit: 'all'});
            assert(pageOne.meta.pagination.total === 2);

            mentions[0].delete();
            await repository.save(mentions[0]);

            const pageTwo = await repository.getPage({page: 1, limit: 'all'});
            assert(pageTwo.meta.pagination.total === 1);
        });
    });
});
