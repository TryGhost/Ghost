/**
 * Database VIEW definitions.
 *
 * Each key is the VIEW name. The value is the raw SQL body (everything after
 * "CREATE VIEW <name> AS"). VIEWs are created during `knex-migrator init`
 * (after all tables) and via versioned migrations for upgrades.
 */
// Resolution rule for the "current" subscription per member:
//   0. `incomplete` and `incomplete_expired` subscriptions are excluded
//      entirely. These represent subs whose first payment never completed
//      (3DS abandoned, card declined, checkout abandoned mid-flow). Ghost
//      doesn't treat the customer as subscribed in these states — the
//      admin API strips them from `member.subscriptions` for the same
//      reason (see `member-bread-service.js`). Excluding them here means a
//      member with only an `incomplete` sub has no resolved current sub
//      (the lookup table has no row for them), matching what the API
//      surfaces.
//   1. Active statuses beat inactive ones — Ghost's convention is the same
//      set used across member-repository, router-controller, etc:
//      `active`, `trialing`, `past_due`, `unpaid` count as active.
//   2. Most recent `created_at` wins — i.e. the subscription that was most
//      recently recorded in Ghost. Tiers (products) in Ghost are discrete
//      rather than hierarchical, so we don't compare price/MRR — whichever
//      subscription the member most recently signed up for or was moved to
//      is the one that represents their current state, regardless of whether
//      that's an "upgrade" or "downgrade".
//
//      We use `created_at` rather than `start_date` because `start_date` can
//      be in the future for scheduled subscriptions — a sub created earlier
//      but scheduled to start later would otherwise out-rank a more recently
//      created sub that's already in effect. `created_at` is monotonic, can
//      never be in the future, and reflects "when this action happened" from
//      Ghost's perspective.
//   3. `id ASC` is a stable final tiebreaker for the rare case where two
//      subscriptions share the same `created_at` (programmatic creation,
//      simultaneous webhooks).
//
// `mostRelevantSubscription` in apps/posts/src/views/members/member-query-params.ts
// must match this ordering so the displayed sub matches the filter result.
module.exports = {
    members_resolved_subscription: `
        SELECT member_id, subscription_id
        FROM (
            SELECT
                msc.member_id,
                mscs.id as subscription_id,
                ROW_NUMBER() OVER (
                    PARTITION BY msc.member_id
                    ORDER BY
                        CASE WHEN mscs.status IN ('active', 'trialing', 'past_due', 'unpaid') THEN 0 ELSE 1 END,
                        mscs.created_at DESC,
                        mscs.id ASC
                ) as rn
            FROM members_stripe_customers_subscriptions mscs
            JOIN members_stripe_customers msc ON msc.customer_id = mscs.customer_id
            WHERE mscs.status NOT IN ('incomplete', 'incomplete_expired')
        ) ranked
        WHERE rn = 1
    `
};
