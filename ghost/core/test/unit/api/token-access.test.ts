import assert from 'node:assert/strict';
import path from 'node:path';
import { globSync } from 'glob';

// Every Admin API endpoint an Admin API key can reach without a signed-in user behind it,
// read from the controllers that declare it. Opening an endpoint to integrations, or
// closing one to staff tokens, is a decision about who can act on a site, so it should
// show up here in review rather than pass unnoticed inside a controller.
function declaredTokenAccess() {
  const controllersRootPath = path.join(__dirname, '../../../core/server/api/endpoints');
  const controllerPaths = globSync('*.{js,ts}', {
    cwd: controllersRootPath,
    ignore: [
      'index.js',
      '*.d.ts',
      'identities.js', // Can't be required before the rest of Ghost has been initialised
    ],
    absolute: true,
  });

  const integrationTokens: string[] = [];
  const noStaffTokens: string[] = [];

  for (const controllerPath of controllerPaths) {
    const exported = require(controllerPath);
    const controller = exported.controller ?? exported;
    const name = path.basename(controllerPath).replace(/\.(js|ts)$/, '');

    for (const [method, config] of Object.entries(controller)) {
      if (!config || typeof config !== 'object') {
        continue;
      }
      if ('integrationTokens' in config && config.integrationTokens === true) {
        integrationTokens.push(`${name}.${method}`);
      }
      if ('staffTokens' in config && config.staffTokens === false) {
        noStaffTokens.push(`${name}.${method}`);
      }
    }
  }

  return { integrationTokens: integrationTokens.sort(), noStaffTokens: noStaffTokens.sort() };
}

describe('Admin API token access', function () {
  it('lets integration tokens call only these endpoints', function () {
    assert.deepEqual(declaredTokenAccess().integrationTokens, [
      'actions.browse',
      'automations.edit',
      'automations.poll',
      'comment-dislikes.browse',
      'comment-likes.browse',
      'comment-replies.browse',
      'comment-replies.read',
      'comment-reports.browse',
      'comments.add',
      'comments.browse',
      'comments.browseAll',
      'comments.edit',
      'config.read',
      'db.backupContent',
      'db.exportContent',
      'db.importContent',
      'db.inlineMedia',
      'files.upload',
      'gift-links.browse',
      'gift-links.create',
      'gift-links.ensure',
      'gifts.flushDeliveries',
      'gifts.flushReminders',
      'images.upload',
      'invites.add',
      'labels.add',
      'labels.browse',
      'labels.destroy',
      'labels.edit',
      'labels.read',
      'media.upload',
      'member-commenting.disable',
      'member-commenting.enable',
      'member-signin-urls.read',
      'members-stripe-connect.auth',
      'members.activityFeed',
      'members.add',
      'members.browse',
      'members.bulkDestroy',
      'members.bulkEdit',
      'members.createSubscription',
      'members.deleteEmailSuppression',
      'members.destroy',
      'members.edit',
      'members.editSubscription',
      'members.exportCSV',
      'members.importCSV',
      'members.logout',
      'members.memberStats',
      'members.mrrStats',
      'members.read',
      'newsletters.add',
      'newsletters.browse',
      'newsletters.edit',
      'newsletters.read',
      'newsletters.verifyPropertyUpdate',
      'oembed.read',
      'offers.add',
      'offers.browse',
      'offers.edit',
      'offers.read',
      'pages.add',
      'pages.browse',
      'pages.bulkDestroy',
      'pages.bulkEdit',
      'pages.copy',
      'pages.destroy',
      'pages.edit',
      'pages.read',
      'posts.add',
      'posts.browse',
      'posts.bulkDestroy',
      'posts.bulkEdit',
      'posts.copy',
      'posts.destroy',
      'posts.edit',
      'posts.exportCSV',
      'posts.importCSV',
      'posts.read',
      'roles.browse',
      'schedules.publish',
      'search-index.fetchPages',
      'search-index.fetchPosts',
      'search-index.fetchTags',
      'search-index.fetchUsers',
      'settings.browse',
      'settings.download',
      'tags.add',
      'tags.browse',
      'tags.destroy',
      'tags.edit',
      'tags.read',
      'themes.activate',
      'themes.install',
      'themes.upload',
      'tiers-checkout-config.browse',
      'tiers-checkout-config.edit',
      'tiers-checkout-config.read',
      'tiers.add',
      'tiers.browse',
      'tiers.edit',
      'tiers.read',
      'users.browse',
      'users.read',
      'users.readStaffToken',
      'webhooks.add',
      'webhooks.destroy',
      'webhooks.edit',
    ]);
  });

  it('refuses staff tokens only on these endpoints', function () {
    assert.deepEqual(declaredTokenAccess().noStaffTokens, [
      'authentication.reset',
      'db.deleteAllContent',
      'users.transferOwnership',
    ]);
  });
});
