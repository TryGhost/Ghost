#!/usr/bin/env node

const {spawnSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const shards = {
    'api-admin-1': [
        './test/e2e-api/admin/actions.test.js',
        './test/e2e-api/admin/activity-feed.test.js',
        './test/e2e-api/admin/api-tokens.test.js',
        './test/e2e-api/admin/authentication.test.js',
        './test/e2e-api/admin/automated-email-design.test.js',
        './test/e2e-api/admin/automated-emails.test.js',
        './test/e2e-api/admin/automations.test.js',
        './test/e2e-api/admin/backup.test.js',
        './test/e2e-api/admin/comments.test.js',
        './test/e2e-api/admin/config.test.js',
        './test/e2e-api/admin/custom-theme-settings.test.js',
        './test/e2e-api/admin/db.test.js',
        './test/e2e-api/admin/email-preview-rate-limiter.test.js',
        './test/e2e-api/admin/email-previews.test.js',
        './test/e2e-api/admin/emails.test.js',
        './test/e2e-api/admin/explore.test.js',
        './test/e2e-api/admin/featurebase.test.js',
        './test/e2e-api/admin/files.test.js',
        './test/e2e-api/admin/gift-reminders.test.js',
        './test/e2e-api/admin/images.test.js',
        './test/e2e-api/admin/integrations.test.js',
        './test/e2e-api/admin/invites.test.js',
        './test/e2e-api/admin/key-authentication.test.js',
        './test/e2e-api/admin/labels.test.js',
        './test/e2e-api/admin/links.test.js',
        './test/e2e-api/admin/max-limit-cap.test.js',
        './test/e2e-api/admin/media.test.js',
        './test/e2e-api/admin/member-commenting.test.js',
        './test/e2e-api/admin/members-edit-subscriptions.test.js',
        './test/e2e-api/admin/members-exporter.test.js',
        './test/e2e-api/admin/members-importer.test.js',
        './test/e2e-api/admin/members-newsletters.test.js',
        './test/e2e-api/admin/members-stripe-connect.test.js',
        './test/e2e-api/admin/members.test.js',
        './test/e2e-api/admin/mentions.test.js'
    ],
    'api-admin-2': [
        './test/e2e-api/admin/newsletters.test.js',
        './test/e2e-api/admin/notifications.test.js',
        './test/e2e-api/admin/oembed.test.js',
        './test/e2e-api/admin/offers.test.js',
        './test/e2e-api/admin/pages-bulk.test.js',
        './test/e2e-api/admin/pages-legacy.test.js',
        './test/e2e-api/admin/pages.test.js',
        './test/e2e-api/admin/post-analytics-export.test.js',
        './test/e2e-api/admin/posts-bulk.test.js',
        './test/e2e-api/admin/posts-legacy.test.js',
        './test/e2e-api/admin/posts.test.js',
        './test/e2e-api/admin/rate-limiting.test.js',
        './test/e2e-api/admin/recommendations.test.js',
        './test/e2e-api/admin/redirects.test.js',
        './test/e2e-api/admin/roles.test.js',
        './test/e2e-api/admin/search-index.test.js',
        './test/e2e-api/admin/session-invalidation.test.js',
        './test/e2e-api/admin/session.test.js',
        './test/e2e-api/admin/settings-files.test.js',
        './test/e2e-api/admin/settings.test.js',
        './test/e2e-api/admin/site.test.js',
        './test/e2e-api/admin/slack.test.js',
        './test/e2e-api/admin/slugs.test.js',
        './test/e2e-api/admin/snippets.test.js',
        './test/e2e-api/admin/sso.test.js',
        './test/e2e-api/admin/stats.test.js',
        './test/e2e-api/admin/storage-adapter-switching.test.js',
        './test/e2e-api/admin/tags.test.js',
        './test/e2e-api/admin/themes.test.js',
        './test/e2e-api/admin/tiers.test.js',
        './test/e2e-api/admin/tinybird.test.js',
        './test/e2e-api/admin/users.test.js',
        './test/e2e-api/admin/webhooks.test.js'
    ],
    'api-public': [
        './test/e2e-api/content',
        './test/e2e-api/members',
        './test/e2e-api/members-comments',
        './test/e2e-api/webmentions'
    ],
    site: [
        './test/e2e-frontend',
        './test/e2e-server',
        './test/e2e-webhooks'
    ]
};

const shardId = process.env.GHOST_E2E_SHARD_ID;

if (!shardId) {
    process.stderr.write('GHOST_E2E_SHARD_ID is required\n');
    process.exit(1);
}

const shardPaths = shards[shardId];
if (!shardPaths) {
    process.stderr.write(`Unknown GHOST_E2E_SHARD_ID: ${shardId}\n`);
    process.stderr.write(`Available shards: ${Object.keys(shards).join(', ')}\n`);
    process.exit(1);
}

const coverageDir = path.join(process.cwd(), 'coverage-e2e', 'raw', shardId);
fs.rmSync(coverageDir, {recursive: true, force: true});
fs.mkdirSync(coverageDir, {recursive: true});

const result = spawnSync('pnpm', ['test:base', ...shardPaths, '--timeout=15000', '-b'], {
    env: {
        ...process.env,
        NODE_V8_COVERAGE: coverageDir
    },
    stdio: 'inherit'
});

if (result.error) {
    process.stderr.write(`${result.error}\n`);
    process.exit(1);
}

process.exit(result.status ?? 1);
