const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');
const _ = require('lodash');

const ghostVersion = require('@tryghost/version');
const {exportedBodyLatest} = require('../../utils/fixtures/export/body-generator');

// Stuff we are testing
const exporter = require('../../../core/server/data/exporter');

describe('Exporter', function () {
    before(testUtils.teardownDb);
    afterEach(testUtils.teardownDb);
    afterEach(function () {
        sinon.restore();
    });
    beforeEach(testUtils.setup('default', 'settings'));

    should.exist(exporter);

    it('exports expected table data', function (done) {
        exporter.doExport().then(function (exportData) {
            const tables = [
                'actions',
                'api_keys',
                'benefits',
                'brute',
                'collections',
                'collections_posts',
                'comments',
                'comment_likes',
                'comment_reports',
                'custom_theme_settings',
                'donation_payment_events',
                'email_batches',
                'email_recipient_failures',
                'email_recipients',
                'email_spam_complaint_events',
                'emails',
                'integrations',
                'invites',
                'jobs',
                'labels',
                'members',
                'members_cancel_events',
                'members_click_events',
                'members_created_events',
                'members_email_change_events',
                'members_feedback',
                'members_labels',
                'members_login_events',
                'members_newsletters',
                'members_paid_subscription_events',
                'members_payment_events',
                'members_product_events',
                'members_products',
                'members_status_events',
                'members_stripe_customers',
                'members_stripe_customers_subscriptions',
                'members_subscribe_events',
                'members_subscription_created_events',
                'mentions',
                'migrations',
                'migrations_lock',
                'milestones',
                'mobiledoc_revisions',
                'newsletters',
                'offers',
                'offer_redemptions',
                'permissions',
                'permissions_roles',
                'permissions_users',
                'post_revisions',
                'posts',
                'posts_authors',
                'posts_meta',
                'posts_products',
                'posts_tags',
                'products',
                'products_benefits',
                'recommendation_click_events',
                'recommendation_subscribe_events',
                'recommendations',
                'redirects',
                'roles',
                'roles_users',
                'sessions',
                'settings',
                'snippets',
                'stripe_prices',
                'stripe_products',
                'subscriptions',
                'suppressions',
                'tags',
                'temp_mail_events',
                'tokens',
                'users',
                'webhooks'
            ];

            should.exist(exportData);
            should.exist(exportData.meta);
            should.exist(exportData.data);

            // NOTE: using `Object.keys` here instead of `should.have.only.keys` assertion
            //       because when `have.only.keys` fails there's no useful diff
            Object.keys(exportData.data).sort().should.eql(tables.sort());
            Object.keys(exportData.data).sort().should.containDeep(Object.keys(exportedBodyLatest().db[0].data));
            exportData.meta.version.should.equal(ghostVersion.full);

            // excludes table should contain no data
            const excludedTables = [
                'sessions',
                'mobiledoc_revisions',
                'post_revisions',
                'email_batches',
                'email_recipient_failures',
                'email_recipients',
                'email_spam_complaint_events',
                'members_cancel_events',
                'members_payment_events',
                'members_login_events',
                'members_email_change_events',
                'members_status_events',
                'members_paid_subscription_events',
                'members_subscribe_events',
                'temp_mail_events'
            ];

            excludedTables.forEach((tableName) => {
                // NOTE: why is this undefined? The key should probably not even be present
                should.equal(exportData.data[tableName], undefined);
            });

            // excludes settings with sensitive data
            const excludedSettings = [
                'stripe_connect_publishable_key',
                'stripe_connect_secret_key',
                'stripe_connect_account_id',
                'stripe_secret_key',
                'stripe_publishable_key',
                'members_stripe_webhook_id',
                'members_stripe_webhook_secret'
            ];

            excludedSettings.forEach((settingKey) => {
                should.not.exist(_.find(exportData.data.settings, {key: settingKey}));
            });

            should.not.exist(_.find(exportData.data.settings, {key: 'permalinks'}));

            // should not export sqlite data
            should.not.exist(exportData.data.sqlite_sequence);
            done();
        }).catch(done);
    });
});
