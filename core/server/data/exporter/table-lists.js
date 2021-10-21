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
    'oauth',
    'permissions',
    'permissions_roles',
    'permissions_users',
    'products',
    'benefits',
    'products_benefits',
    'webhooks',
    'snippets',
    'tokens',
    'sessions',
    'stripe_products',
    'stripe_prices',
    'mobiledoc_revisions',
    'email_batches',
    'email_recipients',
    'members_payment_events',
    'members_login_events',
    'members_email_change_events',
    'members_status_events',
    'members_paid_subscription_events',
    'members_subscribe_events',
    'members_product_events',
    'offers',
    'offer_redemptions'
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
    'users'
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
    'oauth_client_id',
    'oauth_client_secret',
    'email_verification_required'
];

module.exports = {
    BACKUP_TABLES,
    TABLES_ALLOWLIST,
    SETTING_KEYS_BLOCKLIST
};
