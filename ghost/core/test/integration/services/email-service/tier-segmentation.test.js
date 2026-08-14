const {agentProvider, fixtureManager} = require('../../../utils/e2e-framework');
const assert = require('node:assert/strict');
const ObjectID = require('bson-objectid').default;

/**
 * Risk 1 coverage for tier-based email visibility.
 *
 * The email pipeline splits recipients of a tier-restricted post into two
 * segments: members who hold one of the post's tiers (full content) and members
 * who hold none of them (public preview + paywall). The no-access segment is the
 * NQL complement of the access filter — a negation over the to-many `products`
 * relation (`product:-'a'`). This test proves, against a real database and
 * mongo-knex, that the two segments partition the recipients exactly: no member
 * is dropped and no member appears in both — including a member holding multiple
 * tiers.
 *
 * The segments are resolved through the same Member.getFilteredCollectionQuery
 * path that batch-sending-service uses to select recipients, so this exercises
 * the real query engine (not the in-memory NQL queryJSON the web path uses).
 */
describe('Email tier segmentation (recipient partition)', function () {
    let models;
    let goldProduct;
    let silverProduct;

    // Unique label so we only ever query the members this test seeds, never
    // any members created by shared fixtures.
    const LABEL = 'tier-segmentation-test';

    const members = {};

    beforeAll(async function () {
        await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters');

        // Reference models only after Ghost has booted
        models = require('../../../../core/server/models');

        goldProduct = await models.Product.add({
            name: 'Gold Tier (seg test)',
            slug: 'gold-tier-seg',
            type: 'paid',
            active: true
        });
        silverProduct = await models.Product.add({
            name: 'Silver Tier (seg test)',
            slug: 'silver-tier-seg',
            type: 'paid',
            active: true
        });

        const seed = {
            labels: [{name: LABEL}],
            email_disabled: false
        };

        members.gold = await models.Member.add({
            ...seed,
            email: `gold-${ObjectID().toHexString()}@example.com`,
            status: 'paid',
            products: [{id: goldProduct.id}]
        });
        members.silver = await models.Member.add({
            ...seed,
            email: `silver-${ObjectID().toHexString()}@example.com`,
            status: 'paid',
            products: [{id: silverProduct.id}]
        });
        members.both = await models.Member.add({
            ...seed,
            email: `both-${ObjectID().toHexString()}@example.com`,
            status: 'paid',
            products: [{id: goldProduct.id}, {id: silverProduct.id}]
        });
        members.free = await models.Member.add({
            ...seed,
            email: `free-${ObjectID().toHexString()}@example.com`,
            status: 'free'
        });
    });

    afterAll(async function () {
        for (const member of Object.values(members)) {
            if (member) {
                await models.Member.destroy({id: member.id});
            }
        }
        if (goldProduct) {
            await models.Product.destroy({id: goldProduct.id});
        }
        if (silverProduct) {
            await models.Product.destroy({id: silverProduct.id});
        }
    });

    /**
     * Resolve a segment's member filter to the set of seeded members it selects,
     * mirroring how batch-sending-service selects recipients (the segment is
     * AND-ed into the member query). Scoped to this test's label so shared
     * fixtures never leak in.
     */
    async function membersForSegment(segment) {
        const rows = await models.Member
            .getFilteredCollectionQuery({filter: `label:${LABEL}+(${segment})`})
            .select('members.email');
        return new Set(rows.map(row => row.email));
    }

    it('partitions recipients of a tier-restricted post into access and no-access segments', async function () {
        const goldSlug = goldProduct.get('slug');

        // The exact segment strings email-renderer's getSegments() emits for a
        // post restricted to the Gold tier (pinned by the email-renderer unit tests).
        const accessSegment = `product:'${goldSlug}'`;
        const noAccessSegment = `product:-'${goldSlug}'`;

        const accessMembers = await membersForSegment(accessSegment);
        const noAccessMembers = await membersForSegment(noAccessSegment);

        // Access = members holding the Gold tier (gold-only and the multi-tier member)
        assert.deepEqual(accessMembers, new Set([
            members.gold.get('email'),
            members.both.get('email')
        ]), 'access segment should be exactly the members on the Gold tier');

        // No-access = the Silver-only member and the free member
        assert.deepEqual(noAccessMembers, new Set([
            members.silver.get('email'),
            members.free.get('email')
        ]), 'no-access segment should be exactly the members NOT on the Gold tier');

        // The partition must be exact: no overlap, and the union covers everyone.
        const overlap = [...accessMembers].filter(email => noAccessMembers.has(email));
        assert.deepEqual(overlap, [], 'no member may appear in both segments (no double-send)');

        const union = new Set([...accessMembers, ...noAccessMembers]);
        assert.equal(union.size, 4, 'every seeded recipient must land in exactly one segment (no drops)');
    });
});
