import assert from 'node:assert/strict';

const testUtils = require('../../../utils');
const {Member} = require('../../../../core/server/models/member');
const {Product} = require('../../../../core/server/models/product');
const {MemberStripeCustomer} = require('../../../../core/server/models/member-stripe-customer');
const {StripeCustomerSubscription} = require('../../../../core/server/models/stripe-customer-subscription');
const {StripeProduct} = require('../../../../core/server/models/stripe-product');
const {StripePrice} = require('../../../../core/server/models/stripe-price');
const db = require('../../../../core/server/data/db');

const context = testUtils.context.admin;

type SubscriptionOverrides = Partial<{
    customer_id: string;
    subscription_id: string;
    status: string;
    mrr: number;
    plan_interval: string;
    created_at: Date;
    start_date: Date;
    current_period_end: Date;
}>;

const daysAgo = (days: number): Date => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
};

const daysFromNow = (days: number): Date => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
};

const inOneMonth = (): Date => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d;
};

const baseSub = {
    plan_id: 'fake_plan_id',
    stripe_price_id: 'fake_plan_id',
    plan_amount: 1000,
    plan_nickname: 'plan',
    plan_interval: 'month',
    plan_currency: 'usd',
    cancel_at_period_end: false
};

async function createMemberWithCustomer(email: string) {
    const member = await Member.add({email, labels: [], email_disabled: false}, context);
    await MemberStripeCustomer.add({
        member_id: member.get('id'),
        customer_id: `customer_${email}`
    }, context);
    return member;
}

async function addSubscription(email: string, overrides: SubscriptionOverrides) {
    // start_date and current_period_end are required by the schema but aren't
    // part of the resolution rule (we order by `created_at`) — give every test
    // sub sensible defaults so they survive DB validation.
    return StripeCustomerSubscription.add({
        ...baseSub,
        start_date: new Date(),
        current_period_end: inOneMonth(),
        customer_id: `customer_${email}`,
        ...overrides
    }, context);
}

async function resolvedSubscriptionId(memberId: string): Promise<string | null> {
    const row = await db.knex('members_resolved_subscription')
        .where({member_id: memberId})
        .first();
    return row ? row.subscription_id : null;
}

describe('Subscription resolution priority', function () {
    before(testUtils.teardownDb);
    beforeEach(async function () {
        await testUtils.setup('roles')();

        await Product.add({name: 'Test Product', slug: 'test-product', type: 'paid'}, context);
        const product = await Product.findOne({slug: 'test-product'}, context);
        await StripeProduct.add({
            product_id: product.get('id'),
            stripe_product_id: 'fake_product_id'
        }, context);
        await StripePrice.add({
            stripe_price_id: 'fake_plan_id',
            stripe_product_id: 'fake_product_id',
            amount: 1000,
            interval: 'monthly',
            active: 1,
            nickname: 'Monthly',
            currency: 'USD',
            type: 'recurring'
        }, context);
    });
    afterEach(testUtils.teardownDb);

    it('picks an active subscription over a cancelled one regardless of recency', async function () {
        const member = await createMemberWithCustomer('cancel-and-resub@test.member');

        // Cancelled sub is more recent — but active still wins
        const olderActive = await addSubscription('cancel-and-resub@test.member', {
            subscription_id: 'older_active',
            status: 'active',
            created_at: daysAgo(60)
        });
        const recentCancelled = await addSubscription('cancel-and-resub@test.member', {
            subscription_id: 'recent_cancelled',
            status: 'canceled',
            created_at: daysAgo(7)
        });

        const resolved = await resolvedSubscriptionId(member.get('id'));
        assert.equal(resolved, olderActive.get('id'));
        assert.notEqual(resolved, recentCancelled.get('id'));
    });

    it('picks the most recent active subscription on upgrade (Bronze → Silver)', async function () {
        const member = await createMemberWithCustomer('upgrader@test.member');

        const oldBronze = await addSubscription('upgrader@test.member', {
            subscription_id: 'upgrade_bronze',
            status: 'active',
            created_at: daysAgo(90)
        });
        const newSilver = await addSubscription('upgrader@test.member', {
            subscription_id: 'upgrade_silver',
            status: 'active',
            created_at: daysAgo(2)
        });

        const resolved = await resolvedSubscriptionId(member.get('id'));
        assert.equal(resolved, newSilver.get('id'));
        assert.notEqual(resolved, oldBronze.get('id'));
    });

    it('picks the most recent active subscription on downgrade (Silver → Bronze)', async function () {
        // Tiers in Ghost are discrete products, not hierarchical — most recent
        // wins regardless of price. A "downgrade" still means the new
        // subscription represents the member's current state.
        const member = await createMemberWithCustomer('downgrader@test.member');

        const oldSilver = await addSubscription('downgrader@test.member', {
            subscription_id: 'downgrade_silver',
            status: 'active',
            created_at: daysAgo(90)
        });
        const newBronze = await addSubscription('downgrader@test.member', {
            subscription_id: 'downgrade_bronze',
            status: 'active',
            created_at: daysAgo(2)
        });

        const resolved = await resolvedSubscriptionId(member.get('id'));
        assert.equal(resolved, newBronze.get('id'));
        assert.notEqual(resolved, oldSilver.get('id'));
    });

    it('treats trialing, past_due, and unpaid as active alongside active', async function () {
        const member = await createMemberWithCustomer('trial-then-pay@test.member');

        const oldCancelled = await addSubscription('trial-then-pay@test.member', {
            subscription_id: 'trial_old_cancelled',
            status: 'canceled',
            created_at: daysAgo(40)
        });
        const recentTrialing = await addSubscription('trial-then-pay@test.member', {
            subscription_id: 'trial_recent',
            status: 'trialing',
            created_at: daysAgo(3)
        });

        const resolved = await resolvedSubscriptionId(member.get('id'));
        assert.equal(resolved, recentTrialing.get('id'));
        assert.notEqual(resolved, oldCancelled.get('id'));
    });

    it('excludes incomplete subscriptions from resolution — only sub is incomplete', async function () {
        // First-payment failure / 3DS abandoned / checkout abandoned. Ghost
        // does not consider the customer subscribed; the admin API strips
        // these from `member.subscriptions` (member-bread-service.js).
        const member = await createMemberWithCustomer('incomplete-only@test.member');

        await addSubscription('incomplete-only@test.member', {
            subscription_id: 'incomplete_only',
            status: 'incomplete',
            created_at: daysAgo(1)
        });

        assert.equal(await resolvedSubscriptionId(member.get('id')), null);
    });

    it('excludes incomplete_expired subscriptions from resolution — only sub is incomplete_expired', async function () {
        // Terminal status; the first invoice was never paid within Stripe's
        // 23-hour window. The customer never became subscribed.
        const member = await createMemberWithCustomer('incomplete-expired@test.member');

        await addSubscription('incomplete-expired@test.member', {
            subscription_id: 'incomplete_expired_only',
            status: 'incomplete_expired',
            created_at: daysAgo(5)
        });

        assert.equal(await resolvedSubscriptionId(member.get('id')), null);
    });

    it('ignores incomplete subs even when more recent than active subs', async function () {
        // Member with an active sub who later started a checkout that didn't
        // complete: the active sub remains current; the incomplete one is
        // invisible to the resolver.
        const member = await createMemberWithCustomer('active-and-incomplete@test.member');

        const olderActive = await addSubscription('active-and-incomplete@test.member', {
            subscription_id: 'active_keep',
            status: 'active',
            created_at: daysAgo(30)
        });
        await addSubscription('active-and-incomplete@test.member', {
            subscription_id: 'incomplete_ignore',
            status: 'incomplete',
            created_at: daysAgo(1)
        });

        const resolved = await resolvedSubscriptionId(member.get('id'));
        assert.equal(resolved, olderActive.get('id'));
    });

    it('ranks by created_at, not start_date — older sub with future start_date does not out-rank newer sub', async function () {
        // Edge case: a subscription created earlier with a future start_date
        // (e.g. scheduled to begin next billing cycle) should NOT out-rank a
        // more recently created subscription that's already in effect.
        const member = await createMemberWithCustomer('scheduled@test.member');

        const earlierWithFutureStart = await addSubscription('scheduled@test.member', {
            subscription_id: 'scheduled_future',
            status: 'active',
            created_at: daysAgo(30),
            start_date: daysFromNow(30)
        });
        const newerInEffect = await addSubscription('scheduled@test.member', {
            subscription_id: 'scheduled_now',
            status: 'active',
            created_at: daysAgo(2),
            start_date: daysAgo(2)
        });

        const resolved = await resolvedSubscriptionId(member.get('id'));
        assert.equal(resolved, newerInEffect.get('id'));
        assert.notEqual(resolved, earlierWithFutureStart.get('id'));
    });

    it('resolves to the only subscription when a member has just one', async function () {
        const member = await createMemberWithCustomer('only-one@test.member');

        const onlySub = await addSubscription('only-one@test.member', {
            subscription_id: 'only_cancelled',
            status: 'canceled',
            created_at: daysAgo(30)
        });

        const resolved = await resolvedSubscriptionId(member.get('id'));
        assert.equal(resolved, onlySub.get('id'));
    });

    it('breaks identical-created_at ties deterministically by subscription id', async function () {
        const member = await createMemberWithCustomer('twins@test.member');

        const sharedCreated = daysAgo(10);
        const subA = await addSubscription('twins@test.member', {
            subscription_id: 'twin_aaa',
            status: 'active',
            created_at: sharedCreated
        });
        const subB = await addSubscription('twins@test.member', {
            subscription_id: 'twin_zzz',
            status: 'active',
            created_at: sharedCreated
        });

        const lowerId = [subA.get('id'), subB.get('id')].sort()[0];

        const resolved = await resolvedSubscriptionId(member.get('id'));
        assert.equal(resolved, lowerId);
    });

    it('returns no row for a member with no subscriptions', async function () {
        const member = await Member.add({
            email: 'nosubs@test.member',
            labels: [],
            email_disabled: false
        }, context);

        const resolved = await resolvedSubscriptionId(member.get('id'));
        assert.equal(resolved, null);
    });

    it('does not include comped members (no Stripe subscription) in subscription filters', async function () {
        const compedMember = await Member.add({
            email: 'comped@test.member',
            labels: [],
            email_disabled: false,
            products: [{slug: 'test-product'}]
        }, context);

        await Member.add({
            email: 'paid@test.member',
            labels: [],
            email_disabled: false
        }, context);
        await MemberStripeCustomer.add({
            member_id: (await Member.findOne({email: 'paid@test.member'}, context)).get('id'),
            customer_id: 'customer_paid@test.member'
        }, context);
        await addSubscription('paid@test.member', {
            subscription_id: 'paid_active',
            status: 'active',
            created_at: daysAgo(5),
            current_period_end: inOneMonth()
        });

        // Comped member has no row in the resolved view
        assert.equal(await resolvedSubscriptionId(compedMember.get('id')), null);

        // And they're absent from any subscriptions.* filter result set
        const activeMembers = await Member.findPage({filter: 'subscriptions.status:active'});
        assert.equal(
            activeMembers.data.find((m: {id: string}) => m.id === compedMember.get('id')),
            undefined,
            'comped member must not appear in subscriptions.status:active'
        );
    });
});
