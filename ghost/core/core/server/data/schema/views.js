module.exports = [
    {
        name: 'members_subscription_counts',
        body: `SELECT
            msc.member_id,
            COUNT(mscs.id) as subscription_count
        FROM members_stripe_customers msc
        INNER JOIN members_stripe_customers_subscriptions mscs
            ON mscs.customer_id = msc.customer_id
        WHERE mscs.status IN ('active', 'trialing', 'past_due', 'unpaid')
        GROUP BY msc.member_id`
    }
];
