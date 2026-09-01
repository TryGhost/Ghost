import type { Knex } from 'knex';

/** Rows as the driver hands them over, before any schema has looked at them. */
type RawRow = Record<string, unknown>;
export type RawAccount = RawRow;

/** What another domain answered about one subscription. */
export interface ExternalSubscriptionFacts {
  offer: unknown;
  offer_redemptions: unknown[];
  attribution: unknown;
}

/**
 * The reads behind a member's own view of themselves.
 *
 * Every function takes a list of member ids and returns flat rows carrying the id
 * they belong to, so the same query serves one member and a page of them. Grouping
 * rows into a member is the codec's job, not a query's.
 *
 * Collections are separate queries rather than one joined statement on purpose. A
 * member has two independent collections — newsletters and subscriptions — and
 * joining both returns their product, so each subscription would repeat once per
 * newsletter. The alternative to separate queries is JSON aggregation, and that
 * would fork per engine: MySQL spells it JSON_ARRAYAGG and SQLite json_group_array,
 * and MySQL refuses ORDER BY inside the aggregate, so the newsletter order this
 * projection promises could not be stated in SQL at all. Split this way, every
 * query below compiles identically for both engines.
 *
 * What this module does not query is anything another domain owns. Offers carry
 * their own redemption counts, and an attribution resolves a URL through routing
 * configuration rather than a column; both are asked for rather than rebuilt here.
 */

/** A member identified however the caller has them. Exactly one field is used. */
export interface MemberLookup {
  id?: string;
  email?: string;
  uuid?: string;
  transient_id?: string;
}

const MEMBER_COLUMNS = [
  'members.id',
  'members.uuid',
  'members.email',
  'members.name',
  'members.status',
  'members.expertise',
  'members.commenting',
  'members.enable_comment_notifications',
  'members.enable_updates_and_announcements',
  'members.email_disabled',
  'members.created_at',
];

/**
 * The identifiers a member can be looked up by, in the order they are preferred.
 *
 * Listed rather than branched so that "no identifier at all" is a case with an
 * answer. Ghost identifies the reader on every page view of a themed site, and
 * most of those readers are signed out, so an absent identifier is the ordinary
 * case rather than a mistake: it names nobody, and nobody is not an error.
 */
const LOOKUP_COLUMNS: Array<[keyof MemberLookup, string]> = [
  ['id', 'members.id'],
  ['email', 'members.email'],
  ['uuid', 'members.uuid'],
  ['transient_id', 'members.transient_id'],
];

/**
 * The member row, with whether Ghost is holding back email to them.
 *
 * Returns null when the lookup names nobody, rather than a query that cannot
 * compile because its binding is undefined.
 *
 * Suppression is a left join rather than a service call: it is a table, and a
 * member is suppressed either because a provider rejected mail or because Ghost
 * switched it off, which a reader cannot tell apart and does not need to.
 */
export function memberByLookup(knex: Knex, lookup: MemberLookup) {
  const match = LOOKUP_COLUMNS.find(([key]) => lookup[key] !== undefined && lookup[key] !== null);
  if (!match) {
    return null;
  }
  const [key, column] = match;

  return knex('members')
    .leftJoin('suppressions', 'suppressions.email', 'members.email')
    .where(column, lookup[key] as string)
    .select(
      ...MEMBER_COLUMNS,
      'suppressions.reason as suppression_reason',
      'suppressions.created_at as suppression_at',
    )
    .limit(1);
}

/** Ordered here because the projection promises this order and SQL can state it. */
export function newslettersForMembers(knex: Knex, memberIds: string[]) {
  return knex('members_newsletters as mn')
    .join('newsletters as n', 'n.id', 'mn.newsletter_id')
    .whereIn('mn.member_id', memberIds)
    .orderBy('n.sort_order', 'asc')
    .select(
      'mn.member_id',
      'n.id',
      'n.uuid',
      'n.name',
      'n.description',
      'n.sort_order',
      'n.status',
    );
}

/**
 * Real subscriptions, joined to the price they are on and the tier that price
 * belongs to.
 *
 * `plan_*` are columns on the subscription itself — a snapshot of what the member
 * agreed to — while the price is today's, and the two genuinely differ once a
 * publisher edits a price. Both are selected because the payload carries both.
 *
 * Incomplete subscriptions are excluded here rather than filtered afterwards: a
 * first payment that never completed is not a subscription anyone holds, and the
 * same exclusion is what `members_resolved_subscription` applies.
 */
export function stripeSubscriptionsForMembers(knex: Knex, memberIds: string[]) {
  return knex('members_stripe_customers_subscriptions as mscs')
    .join('members_stripe_customers as msc', 'msc.customer_id', 'mscs.customer_id')
    .join('stripe_prices as sp', 'sp.stripe_price_id', 'mscs.stripe_price_id')
    .join('stripe_products as spr', 'spr.stripe_product_id', 'sp.stripe_product_id')
    .join('products as p', 'p.id', 'spr.product_id')
    .leftJoin('members_products as mp', function () {
      this.on('mp.member_id', '=', 'msc.member_id').andOn('mp.product_id', '=', 'p.id');
    })
    .whereIn('msc.member_id', memberIds)
    .whereNotIn('mscs.status', ['incomplete', 'incomplete_expired'])
    .select(
      'msc.member_id',
      'msc.customer_id',
      'msc.name as customer_name',
      'msc.email as customer_email',
      'mscs.id as ghost_subscription_row_id',
      'mscs.subscription_id',
      'mscs.status',
      'mscs.cancel_at_period_end',
      'mscs.cancellation_reason',
      'mscs.current_period_end',
      'mscs.start_date',
      'mscs.default_payment_card_last4',
      'mscs.trial_start_at',
      'mscs.trial_end_at',
      'mscs.discount_start',
      'mscs.discount_end',
      'mscs.offer_id',
      'mscs.plan_id',
      'mscs.plan_nickname',
      'mscs.plan_interval',
      'mscs.plan_amount',
      'mscs.plan_currency',
      'sp.id as price_row_id',
      'sp.stripe_price_id as price_stripe_id',
      'sp.nickname as price_nickname',
      'sp.amount as price_amount',
      'sp.currency as price_currency',
      'sp.interval as price_interval',
      'sp.type as price_type',
      'spr.id as stripe_product_row_id',
      'spr.stripe_product_id',
      'p.id as tier_id',
      'p.name as tier_name',
      'p.slug as tier_slug',
      'p.active as tier_active',
      'p.welcome_page_url as tier_welcome_page_url',
      'p.visibility as tier_visibility',
      'p.trial_days as tier_trial_days',
      'p.description as tier_description',
      'p.type as tier_type',
      'p.currency as tier_currency',
      'p.monthly_price as tier_monthly_price',
      'p.yearly_price as tier_yearly_price',
      'p.monthly_price_id as tier_monthly_price_id',
      'p.yearly_price_id as tier_yearly_price_id',
      'p.created_at as tier_created_at',
      'p.updated_at as tier_updated_at',
      'mp.expiry_at as tier_expiry_at',
    );
}

/**
 * The subscriptions a comped or gifted member holds that Stripe knows nothing
 * about.
 *
 * Nothing recurs and nobody is charged, so no subscription row exists; the payload
 * still carries one so that a client does not have to tell granted access and paid
 * access apart. It is derived from the products the member holds, dated from the
 * event that granted them, and excludes any product a live subscription already
 * covers so the same tier cannot appear twice.
 *
 * The literals the payload carries — an empty id, a masked card, the plan name —
 * are not selected as constant columns. They describe the shape of the answer
 * rather than anything the database knows, so the codec supplies them.
 */
export function grantedSubscriptionsForMembers(knex: Knex, memberIds: string[]) {
  return knex('members as m')
    .join('members_products as mp', 'mp.member_id', 'm.id')
    .join('products as p', 'p.id', 'mp.product_id')
    .whereIn('m.id', memberIds)
    .whereIn('m.status', ['comped', 'gift'])
    .whereNotExists(function () {
      this.select(knex.raw('1'))
        .from('members_stripe_customers as msc')
        .join(
          'members_stripe_customers_subscriptions as mscs',
          'mscs.customer_id',
          'msc.customer_id',
        )
        .join('stripe_prices as sp', 'sp.stripe_price_id', 'mscs.stripe_price_id')
        .join('stripe_products as spr', 'spr.stripe_product_id', 'sp.stripe_product_id')
        .whereRaw('msc.member_id = m.id')
        .whereRaw('spr.product_id = p.id')
        .whereIn('mscs.status', ['active', 'trialing', 'past_due', 'unpaid']);
    })
    .select(
      'm.id as member_id',
      'm.name as customer_name',
      'm.email as customer_email',
      'm.status as member_status',
      'mp.expiry_at as tier_expiry_at',
      'p.id as tier_id',
      'p.name as tier_name',
      'p.slug as tier_slug',
      'p.active as tier_active',
      'p.welcome_page_url as tier_welcome_page_url',
      'p.visibility as tier_visibility',
      'p.trial_days as tier_trial_days',
      'p.description as tier_description',
      'p.type as tier_type',
      'p.currency as tier_currency',
      'p.monthly_price as tier_monthly_price',
      'p.yearly_price as tier_yearly_price',
      'p.monthly_price_id as tier_monthly_price_id',
      'p.yearly_price_id as tier_yearly_price_id',
      'p.created_at as tier_created_at',
      'p.updated_at as tier_updated_at',
      knex.raw(
        `(SELECT MIN(mpe.created_at) FROM members_product_events mpe
          WHERE mpe.member_id = m.id AND mpe.product_id = p.id AND mpe.action = 'added') as granted_at`,
      ),
    );
}

/**
 * The gift behind each gifted member, one per member.
 *
 * Ranked rather than joined. A member can hold more than one redeemed gift, and
 * without a rank the join would repeat the fabricated subscription once per gift.
 * Newest redemption wins, with the id as a stable tiebreaker — the same shape of
 * rule `members_resolved_subscription` states for subscriptions.
 */
export function activeGiftsForMembers(knex: Knex, memberIds: string[]) {
  const ranked = knex('gifts')
    .whereIn('redeemer_member_id', memberIds)
    .where('status', 'redeemed')
    .select(
      'redeemer_member_id as member_id',
      'cadence',
      'currency',
      'amount',
      knex.raw(
        'ROW_NUMBER() OVER (PARTITION BY redeemer_member_id ORDER BY redeemed_at DESC, id ASC) as rn',
      ),
    )
    .as('ranked');

  return knex.select('member_id', 'cadence', 'currency', 'amount').from(ranked).where('rn', 1);
}

/**
 * Everything one member's projection is made of, in a single object.
 *
 * The collections are separate statements for the reason above, but a caller does
 * not need to know that: they ask for a member and get the rows that make one,
 * already grouped. Decoding is then one parse over one object rather than a
 * sequence a caller has to run in the right order.
 *
 * `externals` is what other domains answered about the subscriptions — an offer
 * knows its own redemption counts, an attribution resolves a URL from routing
 * configuration — keyed by the subscription they belong to. Gathering them is the
 * read's job; deciding what they mean is not.
 */
export async function read(
  knex: Knex,
  lookup: MemberLookup,
  externals: {
    forSubscriptions: (
      rows: Array<{
        subscription_id: string;
        ghost_subscription_row_id: string;
        offer_id: string | null;
      }>,
    ) => Promise<Map<string, ExternalSubscriptionFacts>>;
  },
): Promise<RawAccount | null> {
  const query = memberByLookup(knex, lookup);
  if (!query) {
    return null;
  }

  const [member] = await query;
  if (!member) {
    return null;
  }

  const ids = [member.id];
  const [newsletters, stripeRows, grantedRows, gifts] = await Promise.all([
    newslettersForMembers(knex, ids),
    stripeSubscriptionsForMembers(knex, ids),
    grantedSubscriptionsForMembers(knex, ids),
    activeGiftsForMembers(knex, ids),
  ]);

  const facts = await externals.forSubscriptions(stripeRows);
  const now = new Date();

  return {
    ...member,
    newsletters,
    stripeSubscriptions: stripeRows.map((row: RawRow) => ({
      ...row,
      ...(facts.get(row.subscription_id as string) ?? {}),
    })),
    // The gift and the clock travel with each granted subscription, because what
    // a granted subscription costs and when it started are answered from them.
    grantedSubscriptions: grantedRows.map((row: RawRow) => ({
      ...row,
      gift: gifts[0] ?? null,
      now,
    })),
  };
}
