const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyString} = matchers;

const crypto = require('crypto');
const Papa = require('papaparse');
const models = require('../../../core/server/models');
const moment = require('moment');

async function createMember(data) {
    const member = await models.Member.add({
        email: crypto.randomUUID() + '@example.com',
        name: '',
        email_disabled: false,
        ...data
    });

    return member;
}

let agent;
let tiers, labels, newsletters;

function basicAsserts(member, row) {
    // Basic checks
    assert.equal(row.email, member.get('email'));
    assert.equal(row.name, member.get('name'));
    assert.equal(row.note, member.get('note') || '');

    assert.equal(row.deleted_at, '');
    assert.equal(row.created_at, moment(member.get('created_at')).toISOString());
}

/**
 *
 * @param {(row: any) => void} asserts
 */
async function testOutput(member, asserts, filters = []) {
    // Add default filters that always should match
    filters.push('limit=all');
    filters.push(`filter=id:'${member.id}'`);

    for (const filter of filters) {
        // Test all
        let res = await agent
            .get(`/members/upload/?${filter}`)
            .expectStatus(200)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                'content-disposition': anyString
            });

        assert.match(res.text, /id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers/);

        let csv = Papa.parse(res.text, {header: true});
        let row = csv.data.find(r => r.id === member.id);
        assertExists(row);

        asserts(row);

        if (filter === `filter=id:'${member.id}'`) {
            assert.equal(csv.data.length, 1);
        }
    }
}

describe('Members API — exportCSV', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'tiers:archived');
        await agent.loginAsOwner();

        await models.Product.add({
            name: 'Extra Paid Tier',
            slug: 'extra-tier',
            type: 'paid',
            active: true,
            visibility: 'public'
        });

        tiers = (await models.Product.findAll()).models.filter(m => m.get('type') === 'paid');
        assert(tiers.length > 1, 'These tests requires at least two paid tiers');

        await models.Label.add({
            name: 'Label A'
        });

        await models.Label.add({
            name: 'Label B'
        });

        labels = (await models.Label.findAll()).models;
        assert(labels.length > 1, 'These tests requires at least two labels');

        newsletters = (await models.Newsletter.findAll()).models;
        assert(newsletters.length > 1, 'These tests requires at least two newsletters');
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can export tiers', async function () {
        // Create a new member with a product (to be renamed to "tiers" once the changes is done on model layer)
        const member = await createMember({
            name: 'Test member',
            products: tiers
        });

        const tiersList = tiers.map(tier => tier.get('name')).sort().join(',');

        await testOutput(member, (row) => {
            basicAsserts(member, row);
            assert.equal(row.subscribed_to_emails, 'false');
            assert.equal(row.complimentary_plan, '');
            assert.equal(row.tiers.split(',').sort().join(','), tiersList);
        }, [`filter=tier:[${tiers[0].get('slug')}]`, 'filter=subscribed:false']);
    });

    it('Can export a member without tiers', async function () {
        // Create a new member with a product
        const member = await createMember({
            name: 'Test member 2',
            note: 'Just a note 2'
        });

        await testOutput(member, (row) => {
            basicAsserts(member, row);
            assert.equal(row.subscribed_to_emails, 'false');
            assert.equal(row.complimentary_plan, '');
            assert.equal(row.tiers, '');
        }, ['filter=subscribed:false']);
    });

    it('Can export labels', async function () {
        // Create a new member with a product
        const member = await createMember({
            name: 'Test member',
            note: 'Just a note',
            labels: labels.map((l) => {
                return {
                    name: l.get('name')
                };
            })
        });

        const labelsList = labels.map(label => label.get('name')).sort().join(',');

        await testOutput(member, (row) => {
            basicAsserts(member, row);
            assert.equal(row.subscribed_to_emails, 'false');
            assert.equal(row.complimentary_plan, '');
            assert.equal(row.labels.split(',').sort().join(','), labelsList);
            assert.equal(row.tiers, '');
        }, [`filter=label:${labels[0].get('slug')}`, 'filter=subscribed:false']);
    });

    it('Can export comped', async function () {
        // Create a new member with a product
        const member = await createMember({
            name: 'Test member',
            note: 'Just a note',
            status: 'comped'
        });

        await testOutput(member, (row) => {
            basicAsserts(member, row);
            assert.equal(row.subscribed_to_emails, 'false');
            assert.equal(row.complimentary_plan, 'true');
            assert.equal(row.labels, '');
            assert.equal(row.tiers, '');
        }, ['filter=status:comped', 'filter=subscribed:false']);
    });

    it('Can export newsletters', async function () {
        // Create a new member with a product
        const member = await createMember({
            name: 'Test member',
            note: 'Just a note',
            newsletters: [{
                id: newsletters[0].id
            }]
        });

        await testOutput(member, (row) => {
            basicAsserts(member, row);
            assert.equal(row.subscribed_to_emails, 'true');
            assert.equal(row.complimentary_plan, '');
            assert.equal(row.labels, '');
            assert.equal(row.tiers, '');
        }, ['filter=subscribed:true']);
    });

    it('Can export customer id', async function () {
        // Create a new member with a product
        const member = await createMember({
            name: 'Test member',
            note: 'Just a note'
        });

        const customer = await models.MemberStripeCustomer.add({
            member_id: member.id,
            customer_id: 'cus_12345',
            name: 'Test member',
            email: member.get('email')
        });

        // NOTE: we need to create a subscription here because of the way the customer id is currently fetched
        await models.StripeCustomerSubscription.add({
            subscription_id: 'sub_123',
            customer_id: customer.get('customer_id'),
            stripe_price_id: 'price_123',
            status: 'active',
            cancel_at_period_end: false,
            current_period_end: '2023-05-19 09:08:53',
            start_date: '2020-05-19 09:08:53',
            plan_id: 'price_1L15K4JQCtFaIJka01folNVK',
            plan_nickname: 'Yearly',
            plan_interval: 'year',
            plan_amount: 5000,
            plan_currency: 'USD'
        });

        await testOutput(member, (row) => {
            basicAsserts(member, row);
            assert.equal(row.subscribed_to_emails, 'false');
            assert.equal(row.complimentary_plan, '');
            assert.equal(row.labels, '');
            assert.equal(row.tiers, '');
            assert.equal(row.stripe_customer_id, 'cus_12345');
        }, ['filter=subscribed:false', 'filter=subscriptions.subscription_id:sub_123']);
    });
});
