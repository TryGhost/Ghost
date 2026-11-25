import assert from 'node:assert/strict';
import ObjectID from 'bson-objectid';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const {
  mockRecordingMailgun,
  waitForEmailStatus,
  waitForNoActiveSends,
} = require('../../utils/batch-email-utils');
const db = require('../../../core/server/data/db');

type Agent = Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;

/** The members this suite adds, by first name. */
const NAMES = ['ada', 'grace', 'alan', 'linus', 'katherine', 'margaret', 'hedy'] as const;
type Name = (typeof NAMES)[number];

const emailOf = (name: Name) => `${name}@filter-agreement.example`;
const nameOf = (email: string): Name => {
  const name = NAMES.find((candidate) => emailOf(candidate) === email);
  assert.ok(name, `${email} is not a member this suite added`);
  return name;
};

/**
 * Who an email sent through the suite's newsletter can reach: the members subscribed to it whose
 * email isn't disabled. Linus is subscribed with email disabled; Katherine and Hedy aren't
 * subscribed.
 */
const REACHABLE: readonly Name[] = ['ada', 'grace', 'alan', 'margaret'];

/** The ids and slugs the filters below name, known once the suite has set its data up. */
interface Site {
  /** The newsletter every send goes through. */
  newsletterSlug: string;
  /** Another newsletter, which Ada and Katherine subscribe to. */
  otherNewsletterSlug: string;
  /**
   * A post emailed to the other newsletter. Ada and Alan signed up on it, and Grace's paid
   * subscription started on it.
   */
  postId: string;
  paidTierId: string;
  offerId: string;
}

/**
 * Every field the members screen can filter on, written as the members screen writes it, and the
 * members each filter selects from the suite's data. Each filter selects some members and leaves
 * others out, so a filter that loses its condition selects everyone and the test fails.
 */
const FILTERS: ReadonlyArray<{ field: string; filter: (site: Site) => string; expect: Name[] }> = [
  { field: 'name', filter: () => "name:~'Ada'", expect: ['ada'] },
  { field: 'email', filter: () => "email:~'grace'", expect: ['grace'] },
  { field: 'label', filter: () => 'label:[vip]', expect: ['ada', 'grace'] },
  {
    field: 'label, every one of',
    filter: () => 'label:[vip+founder]',
    expect: ['grace'],
  },
  {
    field: 'label, none of',
    filter: () => 'label:-[vip]',
    expect: ['alan', 'linus', 'katherine', 'margaret', 'hedy'],
  },
  {
    field: 'newsletter subscription, subscribed',
    filter: () => '(subscribed:true+email_disabled:0)',
    expect: ['ada', 'grace', 'alan', 'katherine', 'margaret'],
  },
  {
    field: 'newsletter subscription, unsubscribed',
    filter: () => '(subscribed:false+email_disabled:0)',
    expect: ['hedy'],
  },
  {
    field: 'newsletter subscription, not subscribed',
    filter: () => '(subscribed:false,email_disabled:1)',
    expect: ['linus', 'hedy'],
  },
  {
    field: 'newsletter subscription, email disabled',
    filter: () => '(email_disabled:1)',
    expect: ['linus'],
  },
  {
    field: 'one newsletter',
    filter: ({ otherNewsletterSlug }) =>
      `(newsletters.slug:${otherNewsletterSlug}+email_disabled:0)`,
    expect: ['ada', 'katherine'],
  },
  {
    field: 'last seen',
    filter: () => "last_seen_at:<'2025-01-01T00:00:00.000Z'",
    expect: ['ada'],
  },
  {
    field: 'created',
    filter: () => "created_at:>'2025-01-01T00:00:00.000Z'",
    expect: ['grace', 'alan'],
  },
  {
    field: 'signed up on post',
    filter: ({ postId }) => `signup:'${postId}'`,
    expect: ['ada', 'alan'],
  },
  {
    field: 'membership tier',
    filter: ({ paidTierId }) => `tier_id:[${paidTierId}]`,
    expect: ['alan'],
  },
  { field: 'member status, paid', filter: () => 'status:paid', expect: ['grace'] },
  { field: 'member status, not free', filter: () => 'status:-free', expect: ['grace', 'alan'] },
  {
    field: 'member status, free',
    filter: () => 'status:free',
    expect: ['ada', 'linus', 'katherine', 'margaret', 'hedy'],
  },
  { field: 'member status, complimentary', filter: () => 'status:comped', expect: ['alan'] },
  { field: 'billing period', filter: () => 'subscriptions.plan_interval:month', expect: ['grace'] },
  {
    field: 'Stripe subscription status',
    filter: () => 'subscriptions.status:active',
    expect: ['grace'],
  },
  {
    field: 'paid start date',
    filter: () => "subscriptions.start_date:<'2025-01-01T00:00:00.000Z'",
    expect: ['grace'],
  },
  {
    field: 'next billing date',
    filter: () => "subscriptions.current_period_end:>'2025-01-01T00:00:00.000Z'",
    expect: ['grace'],
  },
  {
    field: 'subscription started on post',
    filter: ({ postId }) => `conversion:'${postId}'`,
    expect: ['grace'],
  },
  { field: 'emails sent', filter: () => 'email_count:>2', expect: ['ada'] },
  { field: 'emails opened', filter: () => 'email_opened_count:>1', expect: ['ada'] },
  { field: 'open rate', filter: () => 'email_open_rate:>50', expect: ['ada'] },
  {
    field: 'sent email',
    filter: ({ postId }) => `emails.post_id:'${postId}'`,
    expect: ['ada', 'katherine'],
  },
  {
    field: 'opened email',
    filter: ({ postId }) => `opened_emails.post_id:'${postId}'`,
    expect: ['ada'],
  },
  {
    field: 'clicked email',
    filter: ({ postId }) => `clicked_links.post_id:'${postId}'`,
    expect: ['grace'],
  },
  {
    field: 'responded with feedback',
    filter: ({ postId }) => `(feedback.post_id:'${postId}'+feedback.score:1)`,
    expect: ['alan'],
  },
  { field: 'offer', filter: ({ offerId }) => `offer_redemptions:'${offerId}'`, expect: ['grace'] },
  {
    field: 'multiple active subscriptions',
    filter: () => 'count.active_stripe_customers:>1',
    expect: ['grace'],
  },
  {
    field: 'custom field',
    filter: () => "(metafields.identity:'custom.company'+metafields.value:'Ghost')",
    expect: ['ada'],
  },
  {
    field: 'two conditions',
    filter: () => 'label:[vip]+status:-free',
    expect: ['grace'],
  },
  {
    field: 'either of two conditions',
    filter: () => 'label:[vip],status:comped',
    expect: ['ada', 'grace', 'alan'],
  },
];

/**
 * A filter on any field the members screen offers selects the same members on the members list as
 * in an email send. The email goes to the members the filter selects who are subscribed to the
 * newsletter and can be emailed.
 */
describe('A members filter selects the same members everywhere', function () {
  let agent: Agent;
  let site: Site;

  async function addMember(member: Record<string, unknown>) {
    const { body } = await agent
      .post('members/')
      .body({ members: [member] })
      .expectStatus(201);
    return body.members[0];
  }

  async function addDraft(title: string) {
    const { body } = await agent
      .post('posts/')
      .body({ posts: [{ title, status: 'draft' }] })
      .expectStatus(201);
    return body.posts[0];
  }

  /** Publishes a new post, emailed through `newsletterSlug` to the members `filter` selects. */
  async function send(title: string, newsletterSlug: string, filter: string) {
    const draft = await addDraft(title);
    const { body } = await agent
      .put(
        `posts/${draft.id}/?newsletter=${newsletterSlug}&email_segment=${encodeURIComponent(filter)}`,
      )
      .body({ posts: [{ status: 'published', updated_at: draft.updated_at }] })
      .expectStatus(200);
    const [post] = body.posts;
    await waitForEmailStatus(post.email.id);
    return post;
  }

  async function recipientsOf(emailId: string): Promise<Name[]> {
    const rows: Array<{ member_email: string }> = await db
      .knex('email_recipients')
      .where({ email_id: emailId })
      .select('member_email');
    return rows.map((row) => nameOf(row.member_email)).sort();
  }

  async function membersList(filter?: string): Promise<Name[]> {
    const query = filter ? `filter=${encodeURIComponent(filter)}&` : '';
    const { body } = await agent.get(`members/?${query}limit=all`).expectStatus(200);
    return body.members.map((member: { email: string }) => nameOf(member.email)).sort();
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
    mockRecordingMailgun();

    const addNewsletter = async (name: string) => {
      const { body } = await agent
        .post('newsletters/')
        .body({ newsletters: [{ name }] })
        .expectStatus(201);
      return body.newsletters[0];
    };
    const newsletter = await addNewsletter('Filter agreement');
    const otherNewsletter = await addNewsletter('Filter agreement, other');
    const { body: tiers } = await agent.get('tiers/?filter=type:paid&limit=1').expectStatus(200);
    const paidTier = tiers.tiers[0];
    await agent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name: 'Company', type: 'short_text' }] })
      .expectStatus(201);

    const subscribed = [{ id: newsletter.id }];
    const members = {
      ada: await addMember({
        email: emailOf('ada'),
        name: 'Ada Lovelace',
        labels: ['VIP'],
        newsletters: [{ id: newsletter.id }, { id: otherNewsletter.id }],
        metafields: { custom: { company: 'Ghost' } },
      }),
      grace: await addMember({
        email: emailOf('grace'),
        name: 'Grace Hopper',
        labels: ['VIP', 'Founder'],
        newsletters: subscribed,
        metafields: { custom: { company: 'Acme' } },
      }),
      alan: await addMember({
        email: emailOf('alan'),
        name: 'Alan Turing',
        newsletters: subscribed,
        tiers: [{ id: paidTier.id }],
      }),
      linus: await addMember({
        email: emailOf('linus'),
        name: 'Linus Torvalds',
        newsletters: subscribed,
      }),
      katherine: await addMember({
        email: emailOf('katherine'),
        name: 'Katherine Johnson',
        newsletters: [{ id: otherNewsletter.id }],
      }),
      margaret: await addMember({
        email: emailOf('margaret'),
        name: 'Margaret Hamilton',
        newsletters: subscribed,
      }),
      hedy: await addMember({ email: emailOf('hedy'), name: 'Hedy Lamarr', newsletters: [] }),
    } satisfies Record<Name, unknown>;
    const id = (name: Name): string => members[name].id;
    const memberColumns = (name: Name, columns: Record<string, unknown>) =>
      db
        .knex('members')
        .where({ id: id(name) })
        .update(columns);

    // Sent through the other newsletter, to Ada and Katherine, before the email columns below
    // are set to what earlier sends would have left
    const post = await send('Sent before', otherNewsletter.slug, 'all');
    await db
      .knex('email_recipients')
      .where({ email_id: post.email.id, member_id: id('ada') })
      .update({ opened_at: new Date('2024-06-01T10:00:00Z') });

    await memberColumns('ada', {
      last_seen_at: '2024-06-01 00:00:00',
      created_at: '2024-01-01 00:00:00',
      email_count: 5,
      email_opened_count: 3,
      email_open_rate: 60,
    });
    await memberColumns('grace', {
      status: 'paid',
      last_seen_at: '2025-06-01 00:00:00',
      created_at: '2025-06-01 00:00:00',
      email_count: 1,
      email_opened_count: 1,
      email_open_rate: 40,
    });
    await memberColumns('alan', { created_at: '2025-03-01 00:00:00' });
    await memberColumns('linus', { email_disabled: true, created_at: '2024-02-01 00:00:00' });
    for (const name of ['katherine', 'margaret', 'hedy'] as const) {
      await memberColumns(name, { created_at: '2024-03-01 00:00:00' });
    }

    const now = new Date();
    for (const name of ['ada', 'alan'] as const) {
      await db.knex('members_created_events').insert({
        id: new ObjectID().toHexString(),
        member_id: id(name),
        source: 'member',
        attribution_id: post.id,
        attribution_type: 'post',
        created_at: now,
      });
    }

    const redirectId = new ObjectID().toHexString();
    await db.knex('redirects').insert({
      id: redirectId,
      from: '/r/filter-agreement',
      to: 'https://example.com/',
      post_id: post.id,
      created_at: now,
    });
    await db.knex('members_click_events').insert({
      id: new ObjectID().toHexString(),
      member_id: id('grace'),
      redirect_id: redirectId,
      created_at: now,
    });
    await db.knex('members_feedback').insert([
      {
        id: new ObjectID().toHexString(),
        member_id: id('alan'),
        post_id: post.id,
        score: 1,
        created_at: now,
      },
      {
        id: new ObjectID().toHexString(),
        member_id: id('linus'),
        post_id: post.id,
        score: 0,
        created_at: now,
      },
    ]);

    // Grace pays through two Stripe customers, each with an active subscription, and redeemed an
    // offer on the first
    const offerId = new ObjectID().toHexString();
    await db.knex('offers').insert({
      id: offerId,
      name: 'Filter agreement offer',
      code: 'filter-agreement',
      product_id: paidTier.id,
      interval: 'month',
      discount_type: 'percent',
      discount_amount: 10,
      duration: 'once',
      created_at: now,
    });
    const subscriptionIds: string[] = [];
    for (const [index, interval] of (['month', 'year'] as const).entries()) {
      const customerId = `cus_filter_agreement_${index}`;
      const subscriptionId = new ObjectID().toHexString();
      subscriptionIds.push(subscriptionId);
      await db.knex('members_stripe_customers').insert({
        id: new ObjectID().toHexString(),
        member_id: id('grace'),
        customer_id: customerId,
        created_at: now,
      });
      await db.knex('members_stripe_customers_subscriptions').insert({
        id: subscriptionId,
        customer_id: customerId,
        subscription_id: `sub_filter_agreement_${index}`,
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: '2030-01-01 00:00:00',
        start_date: '2024-06-01 00:00:00',
        created_at: now,
        plan_id: `price_filter_agreement_${index}`,
        plan_nickname: interval,
        plan_interval: interval,
        plan_amount: 500,
        plan_currency: 'usd',
      });
    }
    await db
      .knex('members_current_subscription')
      .insert({ member_id: id('grace'), subscription_id: subscriptionIds[0] });
    await db.knex('offer_redemptions').insert({
      id: new ObjectID().toHexString(),
      offer_id: offerId,
      member_id: id('grace'),
      subscription_id: subscriptionIds[0],
      created_at: now,
    });
    await db.knex('members_subscription_created_events').insert({
      id: new ObjectID().toHexString(),
      member_id: id('grace'),
      subscription_id: subscriptionIds[0],
      attribution_id: post.id,
      attribution_type: 'post',
      created_at: now,
    });

    site = {
      newsletterSlug: newsletter.slug,
      otherNewsletterSlug: otherNewsletter.slug,
      postId: post.id,
      paidTierId: paidTier.id,
      offerId,
    };
  });

  afterAll(async function () {
    await waitForNoActiveSends();
    mockManager.restore();
  });

  it('starts from only the members it added', async function () {
    assert.deepEqual(await membersList(), [...NAMES].sort());
  });

  for (const { field, filter, expect } of FILTERS) {
    it(field, async function () {
      const nql = filter(site);
      const selected = [...expect].sort();
      assert.ok(
        selected.length > 0 && selected.length < NAMES.length,
        'The filter has to select some members and leave others out',
      );

      assert.deepEqual(await membersList(nql), selected, `members list, ${nql}`);

      const post = await send(`Emailed to ${field}`, site.newsletterSlug, nql);
      const reached = selected.filter((name) => REACHABLE.includes(name));
      assert.equal(post.email.email_count, reached.length, `email count, ${nql}`);
      assert.deepEqual(await recipientsOf(post.email.id), reached, `email recipients, ${nql}`);
    });
  }
});
