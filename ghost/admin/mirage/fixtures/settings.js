/* eslint-disable camelcase */
import moment from 'moment-timezone';

let id = 0;

function setting(group, key, value) {
    id = id + 1;

    return {
        id,
        group,
        key,
        value,
        updated_at: moment.utc().format(),
        updated_by: 1,
        created_at: moment.utc().format(),
        created_by: 1
    };
}

// These settings represent a default new site setup
// Real default settings can be found in https://github.com/TryGhost/Ghost/blob/main/ghost/core/core/server/data/schema/default-settings/default-settings.json
export default [
    // SITE
    setting('site', 'title', 'Test Blog'),
    setting('site', 'description', 'Thoughts, stories and ideas'),
    setting('site', 'logo', '/content/images/2013/Nov/logo.png'),
    setting('site', 'cover_image', '/content/images/2014/Feb/cover.jpg'),
    setting('site', 'icon', '/content/images/2014/Feb/favicon.ico'),
    setting('site', 'accent_color', '#ff1a75'),
    setting('site', 'locale', 'en'),
    setting('site', 'timezone', 'Etc/UTC'),
    setting('site', 'codeinjection_head', null),
    setting('site', 'codeinjection_foot', null),
    setting('site', 'facebook', 'test'),
    setting('site', 'twitter', '@test'),
    setting('site', 'navigation', JSON.stringify([
        {label: 'Home', url: '/'},
        {label: 'About', url: '/about'}
    ])),
    setting('site', 'secondary_navigation', JSON.stringify([])),
    setting('site', 'meta_title', null),
    setting('site', 'meta_description', null),
    setting('site', 'og_image', null),
    setting('site', 'og_title', null),
    setting('site', 'og_description', null),
    setting('site', 'twitter_image', null),
    setting('site', 'twitter_title', null),
    setting('site', 'twitter_description', null),

    // THEME
    setting('theme', 'active_theme', 'source'),

    // PRIVATE
    setting('private', 'is_private', false),
    setting('private', 'password', ''),
    setting('private', 'public_hash', ''),

    // MEMBERS
    setting('members', 'default_content_visibility', 'public'),
    setting('members', 'default_content_visibility_tiers', JSON.stringify([])),
    setting('members', 'members_signup_access', 'all'),
    setting('members', 'members_support_address', 'noreply'),
    setting('members', 'stripe_secret_key', null),
    setting('members', 'stripe_publishable_key', null),
    setting('members', 'stripe_plans', JSON.stringify([])),
    setting('members', 'stripe_connect_publishable_key', 'pk_test_for_stripe'),
    setting('members', 'stripe_connect_secret_key', 'sk_test_for_stripe'),
    setting('members', 'stripe_connect_livemode', null),
    setting('members', 'stripe_connect_display_name', null),
    setting('members', 'stripe_connect_account_id', null),
    setting('members', 'members_monthly_price_id', null),
    setting('members', 'members_yearly_price_id', null),
    setting('members', 'members_track_sources', true),

    // PORTAL
    setting('portal', 'portal_name', true),
    setting('portal', 'portal_button', false),
    setting('portal', 'portal_plans', JSON.stringify(['free'])),
    setting('portal', 'portal_default_plan', 'yearly'),
    setting('portal', 'portal_products', JSON.stringify([])),
    setting('portal', 'portal_button_style', 'icon-and-text'),
    setting('portal', 'portal_button_icon', null),
    setting('portal', 'portal_button_signup_text', 'Subscribe'),
    setting('portal', 'portal_signup_terms_html', null),
    setting('portal', 'portal_signup_checkbox_required', false),

    // EMAIL
    setting('email', 'mailgun_domain', null),
    setting('email', 'mailgun_api_key', null),
    setting('email', 'mailgun_base_url', null),
    setting('email', 'email_track_opens', true),
    setting('email', 'email_track_clicks', true),
    setting('email', 'email_verification_required', false),

    // ANALYTICS
    setting('email', 'outbound_link_tagging', true),

    // AMP
    setting('amp', 'amp', false),
    setting('amp', 'amp_gtag_id', null),

    // FIRSTPROMOTER
    setting('firstpromoter', 'firstpromoter', false),
    setting('firstpromoter', 'firstpromoter_id', null),

    // PINTURA
    setting('pintura', 'pintura', false),
    setting('pintura', 'pintura_js_url', null),
    setting('pintura', 'pintura_css_url', null),

    // LABS
    setting('labs', 'labs', JSON.stringify({
        // Keep the GA flags that are not yet cleaned up in frontend code here
    })),

    // SLACK
    setting('slack', 'slack_url', ''),
    setting('slack', 'slack_username', 'Ghost'),

    // UNSPLASH
    setting('unsplash', 'unsplash', true),

    // VIEWS
    setting('views', 'shared_views', JSON.stringify([])),

    // EDITOR
    setting('editor', 'editor_default_email_recipients', 'visibility'),
    setting('editor', 'editor_default_email_recipients_filter', 'all'),

    // DONATIONS
    setting('donations_suggested_amount', 'donations', 500),
    setting('donations_currency', 'donations', 'USD')
];
