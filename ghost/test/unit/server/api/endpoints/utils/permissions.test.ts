import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import errors from '@tryghost/errors';

const permissions = require('../../../../../../core/server/api/endpoints/utils/permissions');
const api = require('../../../../../../core/server/api/endpoints');

/**
 * Admin API methods whose permission check is their own or none, which refuse apps, by their
 * controller's `docName`. A new one fails the test below until it is added here
 * or, only if it is safe for any app whatever its scopes, to the allowlist in
 * `api/endpoints/utils/permissions.js`.
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
  'gift_links.browse',
  'gift_links.create',
  'gift_links.ensure',
  'gift_links.removeAll',
  'images.upload',
  'media.upload',
  'media.uploadThumbnail',
  'members_metafields.add',
  'members_metafields.browse',
  'members_metafields.destroy',
  'members_metafields.edit',
  'members_metafields.read',
  'members_metafields.reorder',
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

const ENDPOINTS_DIR = path.join(__dirname, '../../../../../../core/server/api/endpoints');

/**
 * The `docName` of the controller behind an export of the API, read from the controller its
 * getter requires, since the pipeline doesn't pass `docName` on
 */
function docNameOf(controller: string): string {
  const getter = Object.getOwnPropertyDescriptor(api, controller)?.get?.toString() ?? '';
  // Outside the pipeline, which is all that reads a docName, the export's name will do
  if (!getter.includes('pipeline(')) {
    return controller;
  }
  const [, file, member] = getter.match(/require\('(\.\/[^']+)'\)(?:\.(\w+))?/) ?? [];
  assert.ok(file, `api.${controller} requires its controller`);
  const exported = require(path.join(ENDPOINTS_DIR, file));
  const { docName } = member ? exported[member] : exported;
  assert.ok(docName, `api.${controller} has a docName`);
  return docName;
}

type AdminApiMethod = {
  /** By its controller's `docName`, as the permission stage and the allowlist name it */
  name: string;
  impl: { permissions?: unknown };
};

/**
 * Every method the Admin API routes mount, read from its routes file. Kept apart by export, as
 * two controllers can share a `docName`.
 */
function adminApiMethods(): AdminApiMethod[] {
  const routes = fs.readFileSync(
    path.join(__dirname, '../../../../../../core/server/web/api/endpoints/admin/routes.js'),
    'utf8',
  );
  const methods = new Map<string, AdminApiMethod>();
  for (const [, controller, method] of routes.matchAll(/http\(api\.(\w+)\.(\w+)\)/g)) {
    const impl = api[controller][method];
    // A route mounting a method that doesn't exist runs nothing
    if (impl) {
      methods.set(`${controller}.${method}`, { name: `${docNameOf(controller)}.${method}`, impl });
    }
  }
  return [...methods.values()];
}

const isUnchecked = ({ impl }: AdminApiMethod) =>
  impl.permissions === false || typeof impl.permissions === 'function';

describe('API permissions for apps', function () {
  const app = { kind: 'app' };
  const unchecked = () => {
    const found: string[] = [];
    const outside: string[] = [];
    for (const method of adminApiMethods()) {
      if (!Object.prototype.hasOwnProperty.call(method.impl, 'permissions')) {
        outside.push(method.name);
        continue;
      }
      if (isUnchecked(method)) {
        found.push(method.name);
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

  it('finds no unchecked method sharing its name with another', function () {
    const byName = Map.groupBy(adminApiMethods(), ({ name }) => name);
    const shared = [...byName]
      .filter(([, methods]) => methods.length > 1 && methods.some(isUnchecked))
      .map(([name]) => name);

    // An allowlist entry or refusal for the name would apply to every method with it
    assert.deepEqual(shared, []);
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
