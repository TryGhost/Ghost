#!/usr/bin/env node
/* eslint-disable no-console, ghost/ghost-custom/no-native-error */

/**
 * Seeds multi-subscription test scenarios for BER-3345 verification.
 *
 * Each scenario creates a member with a specific configuration of Stripe
 * subscriptions so the resolution rule (active > inactive, then most recent
 * created_at, then id ASC) can be observed end-to-end in the local admin.
 *
 * Run after `pnpm dev` is up:
 *
 *   pnpm seed:multi-sub-scenarios
 *
 * Idempotent — re-running deletes and re-creates the same set of members.
 * Members use the `multisub-*@verify.test` email convention so they're easy
 * to find or filter out.
 *
 * ## Migration verification flow
 *
 * The script also doubles as a migration test. To exercise the BER-3345
 * backfill migration:
 *
 *   1. Roll back to the previous minor (so `members_current_subscription`
 *      and the VIEW don't exist):
 *
 *          docker exec ghost-dev bash -c 'cd /home/ghost/ghost/core && \
 *              node ../../node_modules/knex-migrator/bin/knex-migrator-rollback \
 *              --v 6.36 --force'
 *
 *   2. Run this script. It seeds members + customers + subscriptions only;
 *      the lookup-table refresh step is skipped when the table is absent:
 *
 *          pnpm seed:multi-sub-scenarios
 *
 *   3. Apply the migrations forward. The backfill migration populates
 *      `members_current_subscription` from existing subscription data:
 *
 *          docker exec ghost-dev bash -c 'cd /home/ghost/ghost/core && \
 *              node ../../node_modules/knex-migrator/bin/knex-migrator migrate'
 *
 *   4. Re-run this script. With the table now present, it reports actual
 *      vs expected resolution for every scenario; mismatches indicate the
 *      backfill produced different values than the runtime path would.
 */

const path = require('path');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.chdir(path.resolve(__dirname, '..'));

const ObjectId = require('bson-objectid').default;
const config = require('../core/shared/config');
const db = require('../core/server/data/db');
const knex = db.knex;

// Each scenario locks in one of the rules of the resolution VIEW.
// `subs` are listed oldest-first (older `created_at`), youngest last.
// `expected` is the email-friendly subscription_id that should win.
const SCENARIOS = [
    {
        name: 'Sarah — active beats cancelled regardless of recency',
        email: 'multisub-sarah@verify.test',
        subs: [
            {id: 'sarah_active_old', status: 'active', daysAgo: 60, tier: 'default-product', mrr: 500},
            {id: 'sarah_cancelled_recent', status: 'canceled', daysAgo: 7, tier: 'default-product', mrr: 0}
        ],
        expected: 'sarah_active_old'
    },
    {
        name: 'Marcus — upgrade (older Bronze + newer Silver, both active) → newer wins',
        email: 'multisub-marcus@verify.test',
        subs: [
            {id: 'marcus_bronze', status: 'active', daysAgo: 90, tier: 'default-product', mrr: 500},
            {id: 'marcus_silver', status: 'active', daysAgo: 2, tier: 'default-product', mrr: 1000}
        ],
        expected: 'marcus_silver'
    },
    {
        name: 'Daria — downgrade (older Silver + newer Bronze, both active) → newer wins',
        email: 'multisub-daria@verify.test',
        subs: [
            {id: 'daria_silver', status: 'active', daysAgo: 90, tier: 'default-product', mrr: 1000},
            {id: 'daria_bronze', status: 'active', daysAgo: 2, tier: 'default-product', mrr: 500}
        ],
        expected: 'daria_bronze'
    },
    {
        name: 'Ivan — trialing counts as active alongside cancelled',
        email: 'multisub-ivan@verify.test',
        subs: [
            {id: 'ivan_old_cancelled', status: 'canceled', daysAgo: 40, tier: 'default-product', mrr: 0},
            {id: 'ivan_recent_trial', status: 'trialing', daysAgo: 3, tier: 'default-product', mrr: 0}
        ],
        expected: 'ivan_recent_trial'
    },
    {
        name: 'Polly — past_due counts as active',
        email: 'multisub-polly@verify.test',
        subs: [
            {id: 'polly_past_due', status: 'past_due', daysAgo: 10, tier: 'default-product', mrr: 1000}
        ],
        expected: 'polly_past_due'
    },
    {
        name: 'Frank — older sub with future start_date does NOT out-rank newer sub',
        email: 'multisub-frank@verify.test',
        subs: [
            {id: 'frank_scheduled_future', status: 'active', daysAgo: 30, daysFromNowStart: 30, tier: 'default-product', mrr: 1000},
            {id: 'frank_in_effect', status: 'active', daysAgo: 2, tier: 'default-product', mrr: 500}
        ],
        expected: 'frank_in_effect'
    },
    {
        name: 'Tom — single cancelled sub resolves to itself',
        email: 'multisub-tom@verify.test',
        subs: [
            {id: 'tom_only_cancelled', status: 'canceled', daysAgo: 30, tier: 'default-product', mrr: 0}
        ],
        expected: 'tom_only_cancelled'
    },
    {
        name: 'Una — comped (no Stripe sub) — absent from members_current_subscription',
        email: 'multisub-una@verify.test',
        subs: [],
        expected: null
    }
];

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'];

function iso(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

function daysFromNow(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
}

async function ensureProductAndPrice() {
    // Pick any paid product — the resolution rule isn't about which tier the
    // sub is on, just whether the sub is currently active. The data generator
    // creates tiers with random slugs (e.g. `bronze-467`) so we don't pin to
    // a specific slug.
    const product = await knex('products').where({type: 'paid'}).first();
    if (!product) {
        throw new Error('Could not find a paid product. Run `pnpm reset:data` first.');
    }
    const stripeProduct = await knex('stripe_products').where({product_id: product.id}).first();
    if (!stripeProduct) {
        throw new Error(`Could not find a Stripe product for ${product.slug}. Run \`pnpm reset:data\` first.`);
    }
    const stripePrice = await knex('stripe_prices')
        .where({stripe_product_id: stripeProduct.stripe_product_id, type: 'recurring'})
        .first();
    if (!stripePrice) {
        throw new Error('Could not find a recurring Stripe price. Run `pnpm reset:data` first.');
    }
    return {product, stripeProduct, stripePrice};
}

async function lookupTableExists() {
    return knex.schema.hasTable('members_current_subscription');
}

async function deleteExistingScenarioMembers() {
    const emails = SCENARIOS.map(s => s.email);
    const members = await knex('members').whereIn('email', emails).select('id');
    if (members.length === 0) {
        return;
    }
    const ids = members.map(m => m.id);
    // The lookup table only exists after the BER-3345 migrations have run.
    // Skip its cleanup if it isn't there yet — useful when running this
    // script BEFORE the migration as part of a backfill verification flow.
    if (await lookupTableExists()) {
        await knex('members_current_subscription').whereIn('member_id', ids).del();
    }
    await knex('members_stripe_customers_subscriptions')
        .whereIn('customer_id', knex('members_stripe_customers').whereIn('member_id', ids).select('customer_id'))
        .del();
    await knex('members_stripe_customers').whereIn('member_id', ids).del();
    await knex('members').whereIn('id', ids).del();
}

async function seedScenario(scenario, {stripePrice}) {
    const memberId = ObjectId().toHexString();
    const now = new Date();
    await knex('members').insert({
        id: memberId,
        uuid: ObjectId().toHexString(),
        transient_id: ObjectId().toHexString(),
        email: scenario.email,
        name: scenario.email.split('@')[0],
        status: scenario.subs.some(s => ACTIVE_STATUSES.includes(s.status)) ? 'paid' : (scenario.subs.length > 0 ? 'free' : 'comped'),
        created_at: iso(now),
        updated_at: iso(now)
    });

    if (scenario.subs.length === 0) {
        return memberId;
    }

    const customerId = `cus_${memberId}`;
    await knex('members_stripe_customers').insert({
        id: ObjectId().toHexString(),
        member_id: memberId,
        customer_id: customerId,
        email: scenario.email,
        created_at: iso(now)
    });

    for (const sub of scenario.subs) {
        const subCreatedAt = daysAgo(sub.daysAgo);
        const startDate = sub.daysFromNowStart ? daysFromNow(sub.daysFromNowStart) : subCreatedAt;
        const periodEnd = daysFromNow(30);
        await knex('members_stripe_customers_subscriptions').insert({
            id: ObjectId().toHexString(),
            customer_id: customerId,
            subscription_id: sub.id,
            stripe_price_id: stripePrice.stripe_price_id,
            plan_id: stripePrice.stripe_price_id,
            plan_amount: stripePrice.amount,
            plan_nickname: stripePrice.nickname || 'Monthly',
            plan_interval: stripePrice.interval || 'month',
            plan_currency: (stripePrice.currency || 'usd').toLowerCase(),
            status: sub.status,
            start_date: iso(startDate),
            current_period_end: iso(periodEnd),
            cancel_at_period_end: false,
            mrr: sub.mrr,
            created_at: iso(subCreatedAt),
            updated_at: iso(subCreatedAt)
        });
    }
    return memberId;
}

async function refreshLookupTable(memberIds) {
    if (memberIds.length === 0) {
        return;
    }
    if (!(await lookupTableExists())) {
        // Migration hasn't run yet — leave the lookup table alone. The
        // backfill migration is responsible for populating it from the VIEW.
        return;
    }
    // Use the same VIEW the production code does, scoped to our seeded members.
    const isMySQL = (config.get('database') && config.get('database').client) === 'mysql2';
    if (isMySQL) {
        await knex.raw(
            `INSERT INTO members_current_subscription (member_id, subscription_id)
             SELECT member_id, subscription_id
             FROM members_resolved_subscription
             WHERE member_id IN (?)
             ON DUPLICATE KEY UPDATE subscription_id = VALUES(subscription_id)`,
            [memberIds]
        );
    } else {
        // SQLite — INSERT OR REPLACE
        await knex.raw(
            `INSERT OR REPLACE INTO members_current_subscription (member_id, subscription_id)
             SELECT member_id, subscription_id
             FROM members_resolved_subscription
             WHERE member_id IN (${memberIds.map(() => '?').join(',')})`,
            memberIds
        );
    }
}

async function summarise() {
    const tableExists = await lookupTableExists();

    console.log('\nSeeded scenarios:\n');
    for (const scenario of SCENARIOS) {
        const member = await knex('members').where({email: scenario.email}).first();
        if (!member) {
            console.log(`  ${scenario.email} — NOT FOUND`);
            continue;
        }
        const lookup = tableExists
            ? await knex('members_current_subscription').where({member_id: member.id}).first()
            : null;
        const resolvedSub = lookup ? await knex('members_stripe_customers_subscriptions').where({id: lookup.subscription_id}).first() : null;
        const actual = resolvedSub ? resolvedSub.subscription_id : null;
        const ok = actual === scenario.expected;
        const marker = ok ? 'OK ' : 'XX ';
        console.log(`  ${marker} ${scenario.email}`);
        console.log(`        ${scenario.name}`);
        console.log(`        expected: ${scenario.expected ?? '(no resolved sub)'}`);
        console.log(`        actual:   ${actual ?? '(no resolved sub)'}`);
    }

    if (!tableExists) {
        console.log('\nThe `members_current_subscription` table does not exist yet —');
        console.log('migrations have not been applied. Apply migrations now to populate the lookup');
        console.log('table from the seeded subscriptions, then re-run this script to verify the');
        console.log('actual resolution against expected values.');
    }
    console.log('\nFilter examples to try in the admin members list:');
    console.log('   subscriptions.status:active   — should NOT include Sarah cancelled gold sub.');
    console.log('   subscriptions.status:canceled — should NOT include any of the active members.');
    console.log('   subscriptions.plan_interval:month — based on resolved sub only.');
    console.log('');
}

async function main() {
    console.log('Connecting to database…');
    const {stripeProduct, stripePrice} = await ensureProductAndPrice();
    console.log(`Using stripe price: ${stripePrice.stripe_price_id} (${stripePrice.nickname || 'Monthly'})`);

    console.log('Cleaning up existing scenario members…');
    await deleteExistingScenarioMembers();

    console.log('Seeding scenarios…');
    const memberIds = [];
    for (const scenario of SCENARIOS) {
        const memberId = await seedScenario(scenario, {stripeProduct, stripePrice});
        memberIds.push(memberId);
    }

    console.log('Refreshing members_current_subscription via the VIEW (if it exists)…');
    await refreshLookupTable(memberIds);

    await summarise();
}

main()
    .then(() => knex.destroy())
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        knex.destroy();
        process.exit(1);
    });
