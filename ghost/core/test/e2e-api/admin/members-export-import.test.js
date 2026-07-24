const path = require('path');
const os = require('os');
const fs = require('fs');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const Papa = require('papaparse');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models');
const jobsService = require('../../../core/server/services/jobs');
const {mockManager} = require('../../utils/e2e-framework');

// A member exported to CSV should re-import cleanly: the export's CSV is a valid
// import, and re-feeding it must not lose or corrupt the members. The fixture spans
// every discrete concern the export carries so the loop exercises the whole column
// set. Two suites run the loop in each state of the membersCustomFields flag: the
// base state (off, what production runs) and the custom-fields state (on) -- the
// flag changes the exported column set, so both need covering. Each test isolates
// its own members with a per-test label so the export/re-import touches only its set.
describe('Members export -> import round-trip', function () {
    let request;
    let tier;
    let newsletter;
    let baseLabel;
    let customLabel;

    const findMember = async (email) => {
        const res = await request
            .get(localUtils.API.getApiQuery(`members/?search=${encodeURIComponent(email)}`))
            .set('Origin', config.get('url'))
            .expect(200);
        return res.body.members.find(m => m.email === email);
    };

    // One member per concern, all tagged with `labelName` so the export can select
    // exactly this set. Returns the emails keyed by concern.
    async function seedMembers(prefix, labelName) {
        const emails = {
            core: `${prefix}-core@example.com`,
            comped: `${prefix}-comped@example.com`,
            tiered: `${prefix}-tiered@example.com`,
            stripe: `${prefix}-stripe@example.com`,
            gift: `${prefix}-gift@example.com`
        };
        const label = {name: labelName};

        await models.Member.add({
            email_disabled: false, email: emails.core, name: 'Core Member', note: 'a core note',
            newsletters: [{id: newsletter.id}], labels: [label]
        });
        await models.Member.add({email_disabled: false, email: emails.comped, name: 'Comped Member', status: 'comped', labels: [label]});
        await models.Member.add({email_disabled: false, email: emails.tiered, name: 'Tiered Member', products: [{id: tier.id}], labels: [label]});

        const stripeMember = await models.Member.add({email_disabled: false, email: emails.stripe, name: 'Stripe Member', labels: [label]});
        const customer = await models.MemberStripeCustomer.add({
            member_id: stripeMember.id, customer_id: `cus_${prefix}`, name: 'Stripe Member', email: emails.stripe
        });
        const subscription = await models.StripeCustomerSubscription.add({
            subscription_id: `sub_${prefix}`, customer_id: customer.get('customer_id'), stripe_price_id: `price_${prefix}`,
            status: 'active', cancel_at_period_end: false, current_period_end: '2032-05-19 09:08:53',
            start_date: '2020-05-19 09:08:53', plan_id: `price_${prefix}`, plan_nickname: 'Yearly',
            plan_interval: 'year', plan_amount: 5000, plan_currency: 'USD'
        });
        await models.Base.knex('members_current_subscription').insert({member_id: stripeMember.id, subscription_id: subscription.get('id')});

        const giftMember = await models.Member.add({email_disabled: false, email: emails.gift, name: 'Gift Member', status: 'gift', products: [{id: tier.id}], labels: [label]});
        const now = new Date();
        await models.Gift.add({
            token: `${prefix}-gift-token`, buyer_email: 'buyer@example.com', buyer_member_id: null,
            redeemer_member_id: giftMember.id, tier_id: tier.id, cadence: 'year', duration: 1, currency: 'usd', amount: 5000,
            stripe_checkout_session_id: `cs_${prefix}`, stripe_payment_intent_id: `pi_${prefix}`,
            consumes_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
            expires_at: new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000),
            status: 'redeemed', purchased_at: now, redeemed_at: now, consumed_at: null, expired_at: null, refunded_at: null
        });

        return emails;
    }

    async function exportSet(labelSlug) {
        const res = await request
            .get(localUtils.API.getApiQuery(`members/upload/?limit=all&filter=label:${labelSlug}`))
            .set('Origin', config.get('url'))
            .expect(200);
        return res.text;
    }

    // The set carries a Stripe customer id, so the import is always deferred.
    async function reimport(csv) {
        const csvPath = path.join(os.tmpdir(), `members-roundtrip-${Date.now()}.csv`);
        fs.writeFileSync(csvPath, csv);
        try {
            const res = await request
                .post(localUtils.API.getApiQuery('members/upload/'))
                .attach('membersfile', csvPath)
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect(202);
            assert.equal(res.body.meta.stats, undefined);
            await jobsService.allSettled();
        } finally {
            fs.unlinkSync(csvPath);
        }
    }

    async function assertSurvivesWithCoreFields(emails) {
        for (const email of Object.values(emails)) {
            assertExists(await findMember(email), `member ${email} survived the round-trip`);
        }
        const core = await findMember(emails.core);
        assert.equal(core.name, 'Core Member');
        assert.equal(core.note, 'a core note');
        assert.equal(core.subscribed, true);
        assert.ok(core.labels.map(l => l.name).some(n => n.startsWith('Round-Trip')), 'labels round-trip');
    }

    beforeAll(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'newsletters', 'members:newsletters');

        await models.Product.add({name: 'Round-Trip Tier', slug: 'round-trip-tier', type: 'paid', active: true, visibility: 'public'});
        tier = (await models.Product.findAll()).models.find(p => p.get('slug') === 'round-trip-tier');
        newsletter = (await models.Newsletter.findAll({filter: 'status:active'})).models[0];

        await models.Label.add({name: 'Round-Trip Base'});
        await models.Label.add({name: 'Round-Trip Custom'});
        const allLabels = (await models.Label.findAll()).models;
        baseLabel = allLabels.find(l => l.get('name') === 'Round-Trip Base');
        customLabel = allLabels.find(l => l.get('name') === 'Round-Trip Custom');
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    // The state production runs in: custom fields off, so no custom_fields columns.
    it('round-trips the base member set with custom fields off', async function () {
        mockManager.mockLabsDisabled('membersCustomFields');

        const emails = await seedMembers('rtbase', baseLabel.get('name'));
        const csv = await exportSet(baseLabel.get('slug'));

        assert.match(csv, /id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers,gift_id/);
        assert.equal(csv.includes('custom_fields.'), false, 'no custom field columns when the flag is off');
        const exported = Papa.parse(csv, {header: true}).data;
        assert.equal(exported.find(r => r.email === emails.core).subscribed_to_emails, 'true');
        assert.equal(exported.find(r => r.email === emails.tiered).tiers, 'Round-Trip Tier');

        await reimport(csv);
        await assertSurvivesWithCoreFields(emails);
    });

    // With the flag on, the export gains a custom_fields.* column and the import now
    // consumes it. Re-importing under a fresh email creates the member from the CSV, so
    // the core fields and the custom field value both reconstruct -- closing the round
    // trip the base issue describes.
    it('exports a custom field and re-imports its value onto a fresh member', async function () {
        mockManager.mockLabsEnabled('membersCustomFields');

        const fieldRes = await request
            .post(localUtils.API.getApiQuery('members/custom_fields/'))
            .set('Origin', config.get('url'))
            .send({members_custom_fields: [{name: 'Round Trip Field', type: 'short_text'}]})
            .expect(201);
        const customFieldKey = fieldRes.body.members_custom_fields[0].key;

        const srcEmail = 'rtcf-src@example.com';
        await models.Member.add({
            email_disabled: false, email: srcEmail, name: 'CF Member', note: 'cf note',
            newsletters: [{id: newsletter.id}], labels: [{name: customLabel.get('name')}]
        });
        const src = await findMember(srcEmail);
        await request
            .put(localUtils.API.getApiQuery(`members/${src.id}/`))
            .set('Origin', config.get('url'))
            .send({members: [{custom_fields: {[customFieldKey]: 'kept value'}}]})
            .expect(200);

        const csv = await exportSet(customLabel.get('slug'));

        // The export produces the custom field column carrying the value.
        assert.ok(csv.includes(`custom_fields.${customFieldKey}`), 'export includes the custom field column');
        assert.equal(Papa.parse(csv, {header: true}).data.find(r => r.email === srcEmail)[`custom_fields.${customFieldKey}`], 'kept value');

        // Sanity: the read path surfaces custom fields for a member that has them, so
        // the "fresh member has none" assertion below is a real gap, not a blind read.
        const srcRead = await request
            .get(localUtils.API.getApiQuery(`members/?search=${encodeURIComponent(srcEmail)}&include=custom_fields`))
            .set('Origin', config.get('url'))
            .expect(200);
        assert.equal(srcRead.body.members.find(m => m.email === srcEmail).custom_fields?.[customFieldKey], 'kept value');

        // Re-import under a fresh email so the member is created from the CSV. No
        // Stripe column, so this imports inline.
        const freshEmail = 'rtcf-fresh@example.com';
        const csvPath = path.join(os.tmpdir(), `members-cf-${Date.now()}.csv`);
        fs.writeFileSync(csvPath, csv.replace(srcEmail, freshEmail));
        try {
            const importRes = await request
                .post(localUtils.API.getApiQuery('members/upload/'))
                .attach('membersfile', csvPath)
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect(201);
            assert.equal(importRes.body.meta.stats.imported, 1);
        } finally {
            fs.unlinkSync(csvPath);
        }

        const freshRes = await request
            .get(localUtils.API.getApiQuery(`members/?search=${encodeURIComponent(freshEmail)}&include=custom_fields`))
            .set('Origin', config.get('url'))
            .expect(200);
        const fresh = freshRes.body.members.find(m => m.email === freshEmail);
        assertExists(fresh);

        // The core fields reconstruct from the export...
        assert.equal(fresh.name, 'CF Member');
        assert.equal(fresh.note, 'cf note');
        assert.equal(fresh.subscribed, true);
        assert.ok(fresh.labels.map(l => l.name).includes('Round-Trip Custom'), 'labels reconstruct');

        // ...and so does the custom field value: the import reads the custom_fields.*
        // column back onto the member.
        assert.equal(fresh.custom_fields?.[customFieldKey], 'kept value', 'custom field value round-trips');
    });

    // A composite field round-trips through the deferred path: the Stripe column defers
    // the import to a background job, which reads the rows back from the JSON spool with
    // their custom_fields.* columns intact. A member who holds no address exports as
    // all-blank sub-cells, which re-import as "leave untouched" rather than failing the
    // row -- the reading the exporter's all-blank cells force.
    it('round-trips an address custom field and leaves a value-less member untouched', async function () {
        mockManager.mockLabsEnabled('membersCustomFields');

        await models.Label.add({name: 'Round-Trip Address'});
        const addressLabel = (await models.Label.findAll()).models.find(l => l.get('name') === 'Round-Trip Address');

        const fieldRes = await request
            .post(localUtils.API.getApiQuery('members/custom_fields/'))
            .set('Origin', config.get('url'))
            .send({members_custom_fields: [{name: 'Shipping Address', type: 'address'}]})
            .expect(201);
        const addressKey = fieldRes.body.members_custom_fields[0].key;

        const emails = await seedMembers('rtaddr', addressLabel.get('name'));
        // Give one seeded member a full address; the rest hold none, so their exported
        // address cells are all blank.
        const withAddress = await findMember(emails.core);
        await request
            .put(localUtils.API.getApiQuery(`members/${withAddress.id}/`))
            .set('Origin', config.get('url'))
            .send({members: [{custom_fields: {[addressKey]: {line1: '1 High Street', city: 'London', postal_code: 'E1 6AN', country: 'GB'}}}]})
            .expect(200);

        const csv = await exportSet(addressLabel.get('slug'));
        assert.ok(csv.includes(`custom_fields.${addressKey}.line1`), 'export expands the address into sub-columns');

        // The set carries a Stripe customer id, so this defers and spools.
        await reimport(csv);

        const reCore = await request
            .get(localUtils.API.getApiQuery(`members/?search=${encodeURIComponent(emails.core)}&include=custom_fields`))
            .set('Origin', config.get('url'))
            .expect(200);
        assert.deepEqual(reCore.body.members.find(m => m.email === emails.core).custom_fields?.[addressKey], {
            line1: '1 High Street', city: 'London', postal_code: 'E1 6AN', country: 'GB'
        }, 'the address reconstructs through the spool');

        // A member who never had an address is not failed by its all-blank cells.
        const reGift = await request
            .get(localUtils.API.getApiQuery(`members/?search=${encodeURIComponent(emails.gift)}&include=custom_fields`))
            .set('Origin', config.get('url'))
            .expect(200);
        const gift = reGift.body.members.find(m => m.email === emails.gift);
        assertExists(gift, 'value-less member survived the round-trip');
        assert.equal(gift.custom_fields?.[addressKey], undefined, 'no address written for a value-less member');
    });
});

function assertExists(value, message) {
    assert.notEqual(value, undefined, message);
    assert.notEqual(value, null, message);
}
