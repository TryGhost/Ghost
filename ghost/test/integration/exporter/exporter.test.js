const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { assertExists } = require('../../utils/assertions');
const sinon = require('sinon');
const testUtils = require('../../utils');
const configUtils = require('../../utils/config-utils');
const _ = require('lodash');

const ghostVersion = require('@tryghost/version');
const { exportedBodyLatest } = require('../../utils/fixtures/export/body-generator');

// Stuff we are testing
const exporter = require('../../../core/server/data/exporter');
const dbBackup = require('../../../core/server/data/db/backup');
const JSONHandler = require('../../../core/server/data/importer/handlers/json');
const dataImporter = require('../../../core/server/data/importer/importers/data');
const models = require('../../../core/server/models');

const collectStreamedExport = async function (options) {
  const chunks = [];
  for await (const chunk of exporter.streamExport(options)) {
    chunks.push(chunk);
  }
  return { chunks, exportData: JSON.parse(chunks.join('')) };
};

// The streamed export reads each table in primary key order, the in-memory export doesn't specify an order
const sortRowsById = function (exportData) {
  return _.mapValues(exportData.data, (rows) => _.sortBy(rows, 'id'));
};

describe('Exporter', function () {
  beforeAll(testUtils.teardownDb);
  afterEach(testUtils.teardownDb);
  afterEach(function () {
    sinon.restore();
  });
  beforeEach(testUtils.setup('default', 'settings'));

  assertExists(exporter);

  it('exports expected table data', async function () {
    const exportData = await exporter.doExport();
    const tables = [
      'actions',
      'api_keys',
      'app_installation_manifests',
      'app_installations',
      'automation_action_edges',
      'automation_action_revisions',
      'automation_actions',
      'automation_run_steps',
      'automation_runs',
      'automation_trigger_tiers',
      'automated_email_recipients',
      'automations',
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
      'email_design_settings',
      'email_recipient_failures',
      'email_recipients',
      'email_spam_complaint_events',
      'emails',
      'gift_deliveries',
      'gift_links',
      'gifts',
      'integrations',
      'invites',
      'jobs',
      'labels',
      'machine_payment_events',
      'members',
      'members_cancel_events',
      'members_click_events',
      'members_created_events',
      'members_current_subscription',
      'members_metafield_bindings',
      'members_metafield_values',
      'members_metafields',
      'members_email_change_events',
      'members_metafield_change_events',
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
      'outbox',
      'permissions',
      'permissions_roles',
      'permissions_users',
      'post_gift_links',
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
      'stripe_checkout_config',
      'stripe_checkout_config_tiers',
      'stripe_prices',
      'stripe_products',
      'subscriptions',
      'suppressions',
      'tags',
      'tinybird_syncs',
      'tokens',
      'users',
      'webhooks',
      'welcome_email_automated_emails',
      'welcome_email_automation_runs',
    ];

    assertExists(exportData);
    assertExists(exportData.meta);
    assertExists(exportData.data);

    // NOTE: using `Object.keys` here instead of `should.have.only.keys` assertion
    //       because when `have.only.keys` fails there's no useful diff
    assert.deepEqual(Object.keys(exportData.data).sort(), tables.sort());
    assert(
      Object.keys(exportedBodyLatest().db[0].data).every((key) =>
        Object.hasOwnProperty.call(exportData.data, key),
      ),
    );
    assert.equal(exportData.meta.version, ghostVersion.full);

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
      'members_metafield_change_events',
      'members_status_events',
      'members_paid_subscription_events',
      'members_subscribe_events',
      'outbox',
      'gift_deliveries',
      'gifts',
      'gift_links',
      'post_gift_links',
    ];

    excludedTables.forEach((tableName) => {
      // NOTE: why is this undefined? The key should probably not even be present
      assert.equal(exportData.data[tableName], undefined);
    });

    // excludes settings with sensitive data
    const excludedSettings = [
      'stripe_connect_publishable_key',
      'stripe_connect_secret_key',
      'stripe_connect_account_id',
      'stripe_secret_key',
      'stripe_publishable_key',
      'members_stripe_webhook_id',
      'members_stripe_webhook_secret',
      'machine_payments_secret',
      'machine_payments_deposit_address',
      'admin_session_secret',
      'theme_session_secret',
      'members_email_auth_secret',
      'members_private_key',
      'ghost_private_key',
    ];

    assert.equal(_.filter(exportData.data.settings, { group: 'core' }).length, 0);

    excludedSettings.forEach((settingKey) => {
      assert.equal(_.find(exportData.data.settings, { key: settingKey }), undefined);
    });

    assert.equal(_.find(exportData.data.settings, { key: 'permalinks' }), undefined);
  });

  describe('streamExport', function () {
    it('parses to the same structure and data as doExport', async function () {
      const expected = JSON.parse(JSON.stringify(await exporter.doExport()));
      const { chunks, exportData } = await collectStreamedExport({ batchSize: 2 });

      assert.deepEqual(Object.keys(exportData), ['meta', 'data']);
      assert.deepEqual(Object.keys(exportData.meta), Object.keys(expected.meta));
      assert.equal(exportData.meta.version, ghostVersion.full);
      assert.deepEqual(Object.keys(exportData.data), Object.keys(expected.data));
      assert.deepEqual(sortRowsById(exportData), sortRowsById(expected));

      assert(exportData.data.posts.length > 2, 'fixture should span several batches');
      const largestChunk = Math.max(...chunks.map((chunk) => chunk.length));
      assert(largestChunk < chunks.join('').length / 2);
    });

    it('filters settings', async function () {
      const { exportData } = await collectStreamedExport({ batchSize: 3 });

      assert(exportData.data.settings.length > 0);
      assert.equal(_.filter(exportData.data.settings, { group: 'core' }).length, 0);
      for (const key of [
        'stripe_secret_key',
        'stripe_connect_secret_key',
        'db_hash',
        'members_private_key',
      ]) {
        assert.equal(_.find(exportData.data.settings, { key }), undefined);
      }
    });

    it('exports included tables', async function () {
      const include = ['mobiledoc_revisions', 'email_recipients', 'migrations', 'brute'];
      const expected = JSON.parse(JSON.stringify(await exporter.doExport({ include })));
      const { exportData } = await collectStreamedExport({ include, batchSize: 2 });

      for (const tableName of include) {
        assert(Array.isArray(exportData.data[tableName]), `${tableName} should be exported`);
      }
      assert.equal(exportData.data.sessions, undefined);
      assert.deepEqual(sortRowsById(exportData), sortRowsById(expected));
    });
  });

  describe('backup round trip', function () {
    let contentPath;

    beforeEach(async function () {
      contentPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-export-test-'));
      await fs.ensureDir(path.join(contentPath, 'data'));
      configUtils.set('paths:contentPath', contentPath);
    });

    afterEach(async function () {
      await configUtils.restore();
      await fs.remove(contentPath);
    });

    it('writes a backup file that the importer accepts', async function () {
      const exportedPosts = await models.Post.findAll(testUtils.context.internal);
      const exportedTags = await models.Tag.findAll(testUtils.context.internal);
      assert(exportedPosts.length > 0);
      assert(exportedTags.length > 0);

      const filePath = await dbBackup.backup({ filename: 'round-trip' });
      assert.equal(filePath, path.join(contentPath, 'data', 'round-trip.json'));

      const importData = await JSONHandler.loadFile([{ path: filePath }]);
      assert.deepEqual(
        sortRowsById(importData),
        sortRowsById(JSON.parse(JSON.stringify(await exporter.doExport()))),
      );

      await testUtils.teardownDb();
      await testUtils.setup('roles', 'owner')();

      await dataImporter.doImport(importData, { returnImportedData: true });

      const importedPosts = await models.Post.findAll(testUtils.context.internal);
      const importedTags = await models.Tag.findAll(testUtils.context.internal);

      assert.deepEqual(
        _.sortBy(
          importedPosts.map((post) => [post.get('slug'), post.get('title'), post.get('html')]),
          0,
        ),
        _.sortBy(
          exportedPosts.map((post) => [post.get('slug'), post.get('title'), post.get('html')]),
          0,
        ),
      );
      assert.deepEqual(
        importedTags.map((tag) => tag.get('slug')).sort(),
        exportedTags.map((tag) => tag.get('slug')).sort(),
      );
    });
  });
});
