import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import errors from '@tryghost/errors';

const permissions = require('../../../../../../core/server/api/endpoints/utils/permissions');
const api = require('../../../../../../core/server/api/endpoints');

/**
 * Admin API methods whose permission check is their own or none, which refuse apps, by the
 * names the routes mount them under. A new one fails the test below until it is added here
 * or, only if it is safe for any app whatever its scopes, to the allowlist in
 * `api/endpoints/utils/permissions.js`, which names a method by its controller's `docName`.
 */
const REFUSED_FOR_APPS = [
  'authentication.acceptInvitation',
  'authentication.isInvitation',
  'authentication.isSetup',
  'authentication.resetPassword',
  'authentication.setup',
  'authentication.updateSetup',
  'config.read',
  'featurebase.token',
  'files.upload',
  'giftLinks.browse',
  'giftLinks.create',
  'giftLinks.ensure',
  'giftLinks.removeAll',
  'images.upload',
  'media.upload',
  'media.uploadThumbnail',
  'membersMetafields.add',
  'membersMetafields.browse',
  'membersMetafields.destroy',
  'membersMetafields.edit',
  'membersMetafields.read',
  'membersMetafields.reorder',
  'oembed.read',
  'presence.leave',
  'presence.poll',
  'schedules.publish',
  // Mounted without authentication, so no app reaches it
  'site.read',
  'slack.sendTest',
  'users.readStaffToken',
  'users.regenerateStaffToken',
  'users.transferOwnership',
];

/** Controllers outside the API pipeline, so its permission stage never sees them */
const OUTSIDE_PIPELINE = [
  // Only DELETE /session authenticates, and its route refuses apps
  'session.add',
  'session.delete',
  'session.sendVerification',
  'session.verify',
];

/** Every `docName.method` the Admin API routes mount, read from its routes file */
function adminApiMethods() {
  const routes = fs.readFileSync(
    path.join(__dirname, '../../../../../../core/server/web/api/endpoints/admin/routes.js'),
    'utf8',
  );
  const methods = new Map<string, { permissions?: unknown }>();
  for (const [, controller, method] of routes.matchAll(/http\(api\.(\w+)\.(\w+)\)/g)) {
    const impl = api[controller][method];
    // A route mounting a method that doesn't exist runs nothing
    if (impl) {
      methods.set(`${controller}.${method}`, impl);
    }
  }
  return methods;
}

describe('API permissions for apps', function () {
  const app = { kind: 'app' };
  const unchecked = () => {
    const found: string[] = [];
    const outside: string[] = [];
    for (const [name, impl] of adminApiMethods()) {
      if (!Object.prototype.hasOwnProperty.call(impl, 'permissions')) {
        outside.push(name);
        continue;
      }
      if (impl.permissions === false || typeof impl.permissions === 'function') {
        found.push(name);
      }
    }
    return { found: [...new Set(found)].sort(), outside: outside.sort() };
  };

  it('knows every Admin API method that checks no standard permission', function () {
    const { found, outside } = unchecked();
    const allowlisted = [...permissions.APP_UNCHECKED_ALLOWLIST];

    assert.deepEqual(found, [...REFUSED_FOR_APPS, ...allowlisted].sort());
    assert.deepEqual(outside, OUTSIDE_PIPELINE);
  });

  it('refuses an app on each', async function () {
    for (const name of REFUSED_FOR_APPS) {
      const [docName, method] = name.split('.');
      await assert.rejects(
        permissions.handleUnchecked(
          { docName, method },
          { options: { context: { principal: app } } },
        ),
        errors.NoPermissionError,
        name,
      );
    }
  });

  it('allows an app on a method on the allowlist', async function () {
    const call = () =>
      permissions.handleUnchecked(
        { docName: 'posts', method: 'browse' },
        { options: { context: { principal: app } } },
      );
    await assert.rejects(call(), errors.NoPermissionError);

    permissions.APP_UNCHECKED_ALLOWLIST.add('posts.browse');
    try {
      await call();
    } finally {
      permissions.APP_UNCHECKED_ALLOWLIST.delete('posts.browse');
    }
  });

  it('leaves every other principal to the method', async function () {
    for (const principal of [{ kind: 'user' }, { kind: 'integration' }, null, undefined]) {
      await permissions.handleUnchecked(
        { docName: 'authentication', method: 'updateSetup' },
        { options: { context: { principal } } },
      );
    }
    await permissions.handleUnchecked(
      { docName: 'authentication', method: 'updateSetup' },
      { options: {} },
    );
  });
});
