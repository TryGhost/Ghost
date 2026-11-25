const assert = require('node:assert/strict');
const { assertExists } = require('../../utils/assertions');
const {
  agentProvider,
  mockManager,
  fixtureManager,
  matchers,
} = require('../../utils/e2e-framework');
const { anyContentVersion, anyString } = matchers;

const crypto = require('crypto');
const Papa = require('papaparse');
const models = require('../../../core/server/models');
const moment = require('moment');
const db = require('../../../core/server/data/db');

async function createMember(data) {
  const member = await models.Member.add({
    email: crypto.randomUUID() + '@example.com',
    name: '',
    email_disabled: false,
    ...data,
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
    const res = await agent
      .get(`/members/upload/?${filter}`)
      .expectStatus(200)
      .expectEmptyBody()
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        'content-disposition': anyString,
      });

    assert.match(
      res.text,
      /id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers,gift_id/,
    );

    const csv = Papa.parse(res.text, { header: true });
    const row = csv.data.find((r) => r.id === member.id);
    assertExists(row);

    asserts(row);

    if (filter === `filter=id:'${member.id}'`) {
      assert.equal(csv.data.length, 1);
    }
  }
}

describe('Members API — exportCSV', function () {
  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'tiers:archived');
    await agent.loginAsOwner();

    await models.Product.add({
      name: 'Extra Paid Tier',
      slug: 'extra-tier',
      type: 'paid',
      active: true,
      visibility: 'public',
    });

    tiers = (await models.Product.findAll()).models.filter((m) => m.get('type') === 'paid');
    assert(tiers.length > 1, 'These tests requires at least two paid tiers');

    await models.Label.add({
      name: 'Label A',
    });

    await models.Label.add({
      name: 'Label B',
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

  it('exports filtered members in bounded batches without duplicating subscriptions', async function () {
    const filter = '(subscribed:true+email_disabled:0)+status:free';
    const active = newsletters.filter((newsletter) => newsletter.get('status') === 'active');
    const batch = Array.from({ length: 1001 }, (_, i) => ({
      id: models.Base.Model.generateId(),
      email: `filtered-export-${i}@example.com`,
      uuid: crypto.randomUUID(),
      transient_id: crypto.randomUUID(),
      created_at: '2025-01-01 00:00:00',
    }));
    const knex = db.knex;
    await knex.batchInsert('members', batch, 100);
    try {
      await knex.batchInsert(
        'members_newsletters',
        batch.map(({ id }) => ({
          id: models.Base.Model.generateId(),
          member_id: id,
          newsletter_id: active[0].id,
        })),
        100,
      );
      await knex('members_newsletters').insert({
        id: models.Base.Model.generateId(),
        member_id: batch[0].id,
        newsletter_id: active[1].id,
      });

      const memberReads = [];
      const capture = (query) => {
        if (query.sql.startsWith('select') && query.sql.includes(' from `members`')) {
          memberReads.push(query);
        }
      };
      const openSnapshot = models.Member.activeNewsletterIds;
      models.Member.activeNewsletterIds = async function (transaction) {
        const ids = await openSnapshot.call(this, transaction);
        await knex('newsletters').where('id', active[0].id).update({ status: 'archived' });
        await knex('members_newsletters').where('member_id', batch.at(-1).id).del();
        return ids;
      };
      knex.on('query', capture);
      let res;
      try {
        res = await agent
          .get(`/members/upload/?filter=${encodeURIComponent(filter)}`)
          .expectStatus(200);
      } finally {
        models.Member.activeNewsletterIds = openSnapshot;
        knex.off('query', capture);
        await knex('newsletters').where('id', active[0].id).update({ status: 'active' });
      }

      const csv = Papa.parse(res.text, { header: true, skipEmptyLines: true });
      assert.deepEqual(csv.errors, []);
      assert.deepEqual(
        csv.data.map((row) => row.id),
        batch.map((row) => row.id).sort(),
      );
      assert.equal(memberReads.length, 2);
      assert.ok(memberReads[0].sql.includes('exists (select 1 from `members_newsletters`'));
      assert.ok(memberReads[1].sql.includes('`members`.`id` > ?'));
      assert.ok(
        memberReads.every(
          (query) => query.sql.endsWith('limit ?') && query.bindings.at(-1) === 1000,
        ),
      );
      const search = await agent.get('/members/upload/?search=filtered-export-').expectStatus(200);
      const searchRows = Papa.parse(search.text, { header: true, skipEmptyLines: true });
      assert.deepEqual(searchRows.errors, []);
      assert.deepEqual(
        searchRows.data.map((row) => row.id).sort(),
        batch.map((row) => row.id).sort(),
      );

      const exportUrl = `/members/upload/?filter=${encodeURIComponent(filter)}`;
      const { export: exportMembers } = require('../../../core/server/services/members');
      const buildQuery = models.Member.getFilteredCollectionQuery;
      let snapshotClosed;
      let secondBatchStarted;
      const started = new Promise((resolve) => {
        secondBatchStarted = resolve;
      });
      let rejectSecondBatch;
      const failed = new Promise((_, reject) => {
        rejectSecondBatch = reject;
      });
      failed.catch(() => {});
      models.Member.getFilteredCollectionQuery = function (...args) {
        snapshotClosed = args[0].transacting.executionPromise;
        const query = buildQuery.apply(this, args);
        const clone = query.clone.bind(query);
        let batches = 0;
        query.clone = () => {
          const batchQuery = clone();
          batches += 1;
          if (batches === 2) {
            batchQuery.limit = () => {
              secondBatchStarted();
              return failed;
            };
          }
          return batchQuery;
        };
        return query;
      };
      try {
        const stream = await exportMembers({
          filter,
          mongoTransformer: require('@tryghost/nql').utils.mapKeyValues({
            key: { from: 'subscribed', to: 'newsletters.status' },
            values: [{ from: true, to: 'active' }],
          }),
        });
        const streamFailed = assert.rejects(async () => {
          for await (const row of stream) {
            assert.ok(row.id);
          }
        }, /Second batch failed/);
        await Promise.race([started, streamFailed]);
        const referenceQueries = [];
        const captureReferenceReads = ({ sql }) => {
          if (sql.includes('from `products`') || sql.includes('from `labels`')) {
            referenceQueries.push(sql);
          }
        };
        knex.on('query', captureReferenceReads);
        try {
          await agent.get(exportUrl).expectStatus(429);
          assert.deepEqual(referenceQueries, []);
        } finally {
          knex.off('query', captureReferenceReads);
        }
        rejectSecondBatch(new Error('Second batch failed'));
        await streamFailed;
        await snapshotClosed;
      } finally {
        rejectSecondBatch(new Error('Second batch failed'));
        models.Member.getFilteredCollectionQuery = buildQuery;
      }
      await agent.get(exportUrl).expectStatus(200);
    } finally {
      await knex('members')
        .whereIn(
          'id',
          batch.map((row) => row.id),
        )
        .del();
    }
  });

  it('exports free subscribers without batching when the filter compiles to a different query', async function () {
    const filter = '(subscribed:true+email_disabled:0)+status:free';
    const exportUrl = `/members/upload/?filter=${encodeURIComponent(filter)}`;
    const active = newsletters.find((newsletter) => newsletter.get('status') === 'active');
    const member = await createMember({ newsletters: [{ id: active.id }] });
    const exportedIds = async () => {
      const res = await agent.get(exportUrl).expectStatus(200);
      const csv = Papa.parse(res.text, { header: true, skipEmptyLines: true });
      assert.deepEqual(csv.errors, []);
      return csv.data.map((row) => row.id).sort();
    };

    const knex = db.knex;
    const applyFilters = models.Member.prototype.applyDefaultAndCustomFilters;
    try {
      const expected = await exportedIds();
      assert.ok(expected.includes(member.id));

      models.Member.prototype.applyDefaultAndCustomFilters = function (options) {
        const result = applyFilters.call(this, options);
        this.query((qb) => qb.whereRaw('1 = 1'));
        return result;
      };
      const memberReads = [];
      const capture = (query) => {
        if (query.sql.startsWith('select') && query.sql.includes(' from `members`')) {
          memberReads.push(query);
        }
      };
      knex.on('query', capture);
      let actual;
      try {
        actual = await exportedIds();
      } finally {
        knex.off('query', capture);
      }

      assert.deepEqual(actual, expected);
      assert.ok(memberReads.length > 0);
      assert.ok(memberReads.every((query) => !query.sql.includes('exists (select 1')));
      assert.ok(memberReads.every((query) => !query.sql.endsWith('limit ?')));
    } finally {
      models.Member.prototype.applyDefaultAndCustomFilters = applyFilters;
      await knex('members').where('id', member.id).del();
    }
  });

  it('Can export tiers', async function () {
    // Create a new member with a product (to be renamed to "tiers" once the changes is done on model layer)
    const member = await createMember({
      name: 'Test member',
      products: tiers,
    });

    const tiersList = tiers
      .map((tier) => tier.get('name'))
      .sort()
      .join(',');

    await testOutput(
      member,
      (row) => {
        basicAsserts(member, row);
        assert.equal(row.subscribed_to_emails, 'false');
        assert.equal(row.complimentary_plan, '');
        assert.equal(row.tiers.split(',').sort().join(','), tiersList);
      },
      [`filter=tier:[${tiers[0].get('slug')}]`, 'filter=subscribed:false'],
    );
  });

  it('Can export a member without tiers', async function () {
    // Create a new member with a product
    const member = await createMember({
      name: 'Test member 2',
      note: 'Just a note 2',
    });

    await testOutput(
      member,
      (row) => {
        basicAsserts(member, row);
        assert.equal(row.subscribed_to_emails, 'false');
        assert.equal(row.complimentary_plan, '');
        assert.equal(row.tiers, '');
      },
      ['filter=subscribed:false'],
    );
  });

  it('Can export labels', async function () {
    // Create a new member with a product
    const member = await createMember({
      name: 'Test member',
      note: 'Just a note',
      labels: labels.map((l) => {
        return {
          name: l.get('name'),
        };
      }),
    });

    const labelsList = labels
      .map((label) => label.get('name'))
      .sort()
      .join(',');

    await testOutput(
      member,
      (row) => {
        basicAsserts(member, row);
        assert.equal(row.subscribed_to_emails, 'false');
        assert.equal(row.complimentary_plan, '');
        assert.equal(row.labels.split(',').sort().join(','), labelsList);
        assert.equal(row.tiers, '');
      },
      [`filter=label:${labels[0].get('slug')}`, 'filter=subscribed:false'],
    );
  });

  it('Can export comped', async function () {
    // Create a new member with a product
    const member = await createMember({
      name: 'Test member',
      note: 'Just a note',
      status: 'comped',
    });

    await testOutput(
      member,
      (row) => {
        basicAsserts(member, row);
        assert.equal(row.subscribed_to_emails, 'false');
        assert.equal(row.complimentary_plan, 'true');
        assert.equal(row.labels, '');
        assert.equal(row.tiers, '');
        assert.equal(row.gift_id, '');
      },
      ['filter=status:comped', 'filter=subscribed:false'],
    );
  });

  it('Can export gift_id for gift members', async function () {
    const tier = tiers[0];
    const member = await createMember({
      name: 'Test gift member',
      note: 'A gift',
      status: 'gift',
      products: [{ id: tier.id }],
    });

    const now = new Date();
    const gift = await models.Gift.add({
      token: `exporter-test-token-${Date.now()}`,
      buyer_email: 'buyer@example.com',
      buyer_member_id: null,
      redeemer_member_id: member.id,
      tier_id: tier.id,
      cadence: 'year',
      duration: 1,
      currency: 'usd',
      amount: 5000,
      stripe_checkout_session_id: `cs_exporter_${Date.now()}`,
      stripe_payment_intent_id: `pi_exporter_${Date.now()}`,
      consumes_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      expires_at: new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000),
      status: 'redeemed',
      purchased_at: now,
      redeemed_at: now,
      consumed_at: null,
      expired_at: null,
      refunded_at: null,
    });

    await testOutput(
      member,
      (row) => {
        basicAsserts(member, row);
        assert.equal(row.subscribed_to_emails, 'false');
        assert.equal(row.complimentary_plan, '');
        assert.equal(row.gift_id, gift.id);
        assert.equal(row.tiers, tier.get('name'));
      },
      ['filter=status:gift', 'filter=subscribed:false'],
    );
  });

  it('Does not export gift_id for members whose gift is consumed', async function () {
    const tier = tiers[0];
    const member = await createMember({
      name: 'Test ex-gift member',
      note: 'Gift was consumed',
      status: 'paid',
      products: [{ id: tier.id }],
    });

    const now = new Date();
    await models.Gift.add({
      token: `exporter-consumed-token-${Date.now()}`,
      buyer_email: 'buyer@example.com',
      buyer_member_id: null,
      redeemer_member_id: member.id,
      tier_id: tier.id,
      cadence: 'year',
      duration: 1,
      currency: 'usd',
      amount: 5000,
      stripe_checkout_session_id: `cs_exporter_consumed_${Date.now()}`,
      stripe_payment_intent_id: `pi_exporter_consumed_${Date.now()}`,
      consumes_at: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      expires_at: new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000),
      status: 'consumed',
      purchased_at: now,
      redeemed_at: now,
      consumed_at: now,
      expired_at: null,
      refunded_at: null,
    });

    await testOutput(
      member,
      (row) => {
        basicAsserts(member, row);
        assert.equal(row.gift_id, '');
      },
      [`filter=email:'${member.get('email')}'`, 'filter=subscribed:false'],
    );
  });

  it('Can export newsletters', async function () {
    // Create a new member with a product
    const member = await createMember({
      name: 'Test member',
      note: 'Just a note',
      newsletters: [
        {
          id: newsletters[0].id,
        },
      ],
    });

    await testOutput(
      member,
      (row) => {
        basicAsserts(member, row);
        assert.equal(row.subscribed_to_emails, 'true');
        assert.equal(row.complimentary_plan, '');
        assert.equal(row.labels, '');
        assert.equal(row.tiers, '');
      },
      ['filter=subscribed:true'],
    );
  });

  it('Can export customer id', async function () {
    // Create a new member with a product
    const member = await createMember({
      name: 'Test member',
      note: 'Just a note',
    });

    const customer = await models.MemberStripeCustomer.add({
      member_id: member.id,
      customer_id: 'cus_12345',
      name: 'Test member',
      email: member.get('email'),
    });

    // NOTE: we need to create a subscription here because of the way the customer id is currently fetched
    const subscription = await models.StripeCustomerSubscription.add({
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
      plan_currency: 'USD',
    });

    await db.knex('members_current_subscription').insert({
      member_id: member.id,
      subscription_id: subscription.get('id'),
    });

    await testOutput(
      member,
      (row) => {
        basicAsserts(member, row);
        assert.equal(row.subscribed_to_emails, 'false');
        assert.equal(row.complimentary_plan, '');
        assert.equal(row.labels, '');
        assert.equal(row.tiers, '');
        assert.equal(row.stripe_customer_id, 'cus_12345');
      },
      ['filter=subscribed:false', 'filter=subscriptions.subscription_id:sub_123'],
    );
  });

  // The single-member tests above each exercise one kind of related data in
  // isolation. This streams a whole file of members that differ in their related
  // data and checks each row carries its own — the streaming/batching path where a
  // per-batch map keyed by the wrong member_id would silently cross the wires.
  it('streams a file of mixed members, each with its own related data', async function () {
    const tier = tiers[0];

    const plain = await createMember({ name: 'Mixed Plain', note: 'plain' });
    const tiered = await createMember({ name: 'Mixed Tiered', products: [{ id: tier.id }] });
    const labelled = await createMember({
      name: 'Mixed Labelled',
      labels: labels.map((l) => ({ name: l.get('name') })),
    });
    const comped = await createMember({ name: 'Mixed Comped', status: 'comped' });
    const subscribed = await createMember({
      name: 'Mixed Subscribed',
      newsletters: [{ id: newsletters[0].id }],
    });

    // No filter + limit=all takes the "export everything" streaming branch.
    const res = await agent
      .get('/members/upload/?limit=all')
      .expectStatus(200)
      .expectEmptyBody()
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        'content-disposition': anyString,
      });

    assert.match(
      res.text,
      /id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers,gift_id/,
    );
    const rows = Papa.parse(res.text, { header: true }).data;
    const rowFor = (id) => rows.find((r) => r.id === id);

    const labelsList = labels
      .map((l) => l.get('name'))
      .sort()
      .join(',');

    const p = rowFor(plain.id);
    assertExists(p);
    assert.equal(p.tiers, '');
    assert.equal(p.labels, '');
    assert.equal(p.complimentary_plan, '');
    assert.equal(p.subscribed_to_emails, 'false');

    const t = rowFor(tiered.id);
    assertExists(t);
    assert.equal(t.tiers, tier.get('name'));
    assert.equal(t.labels, '');

    const l = rowFor(labelled.id);
    assertExists(l);
    assert.equal(l.labels.split(',').sort().join(','), labelsList);
    assert.equal(l.tiers, '');

    const c = rowFor(comped.id);
    assertExists(c);
    assert.equal(c.complimentary_plan, 'true');

    const s = rowFor(subscribed.id);
    assertExists(s);
    assert.equal(s.subscribed_to_emails, 'true');
  });
});
