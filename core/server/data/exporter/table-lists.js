// NOTE: these tables can be optionally included to have full db-like export
const BACKUP_TABLES = [
    'actions',
    'api_keys',
    'brute',
    'emails',
    'integrations',
    'invites',
    'labels',
    'members',
    'members_labels',
    'members_products',
    'members_stripe_customers',
    'members_stripe_customers_subscriptions',
    'migrations',
    'migrations_lock',
    'permissions',
    'permissions_roles',
    'permissions_users',
    'webhooks',
    'tokens',
    'sessions',
    'mobiledoc_revisions',
    'email_batches',
    'email_recipients',
    'members_cancel_events',
    'members_payment_events',
    'members_login_events',
    'members_email_change_events',
    'members_status_events',
    'members_paid_subscription_events',
    'members_subscribe_events',
    'members_product_events',
    'members_newsletters'

];

// NOTE: exposing only tables which are going to be included in a "default" export file
//       they should match with the data that is supported by the importer.
//       In the future it's best to move to resource-based exports instead of database-based ones
const TABLES_ALLOWLIST = [
    'posts',
    'posts_authors',
    'posts_meta',
    'posts_tags',
    'roles',
    'roles_users',
    'settings',
    'custom_theme_settings',
    'tags',
    'users',
    'products',
    'stripe_products',
    'stripe_prices',
    'posts_products',
    'newsletters',
    'benefits',
    'products_benefits',
    'offers',
    'offer_redemptions',
    'snippets'
];

// NOTE: these are settings keys which should never end up in the export file
const SETTING_KEYS_BLOCKLIST = [
    'stripe_connect_publishable_key',
    'stripe_connect_secret_key',
    'stripe_connect_account_id',
    'stripe_secret_key',
    'stripe_publishable_key',
    'members_stripe_webhook_id',
    'members_stripe_webhook_secret',
    'email_verification_required'
];

module.exports = {
    BACKUP_TABLES,
    TABLES_ALLOWLIST,
    SETTING_KEYS_BLOCKLIST
};
