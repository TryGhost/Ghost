import assert from 'node:assert/strict';
import { authorize } from '../../../../../core/server/auth/policy/authorize';
import { capabilities } from '../../../../../core/server/auth/policy/capabilities';
import { rowRules } from '../../../../../core/server/auth/policy/rules';
import { scopesAllow } from '../../../../../core/server/auth/policy/scopes';
import type { Principal } from '../../../../../core/server/auth/principal';

const roleViews = (roles: string[]) => roles.map((name) => ({ id: `role-${name}`, name }));
const userView = (roles: string[]) => ({
  id: '1',
  email: 'a@example.com',
  name: 'A',
  status: 'active',
  roles: roleViews(roles),
});
const user = (roles: string[], scopes?: string[]): Principal => ({
  kind: 'user',
  method: 'session',
  user: userView(roles),
  ...(scopes ? { scopes } : {}),
});
const integration = (role: string | null, scopes?: string[]): Principal => ({
  kind: 'integration',
  method: role ? 'admin_api_key' : 'content_api_key',
  apiKey: {
    id: 'key',
    type: role ? 'admin' : 'content',
    user_id: null,
    integration_id: 'integration',
    role: role ? { id: `role-${role}`, name: role } : null,
  },
  integration: null,
  ...(scopes ? { scopes } : {}),
});
const appPrincipal = (roles: string[] | null, scopes: string[] | undefined): Principal => ({
  kind: 'app',
  method: roles ? 'oauth_authorization_code' : 'oauth_client_credentials',
  app: { id: 'installation' },
  actingFor: roles ? userView(roles) : null,
  scopes: scopes as string[],
});

const noPermission = { errorType: 'NoPermissionError' };

describe('Authorization policy', function () {
  describe('capabilities', function () {
    it('grants Owner every key, unscoped', function () {
      const owner = capabilities(user(['Owner']));
      assert(owner.granted.has('db:deleteAllContent'));
      assert(owner.granted.has('upgrade:add'));
      assert.equal(owner.granted, capabilities({ kind: 'internal' }).granted);
      assert.equal(owner.scopes, 'unlimited');
    });

    it('grants a staff role its role grants', function () {
      const { granted } = capabilities(user(['Contributor']));
      assert(granted.has('post:browse'));
      assert(!granted.has('post:publish'));
      assert(!granted.has('setting:edit'));
    });

    it('grants the union of a user’s roles, whatever their order', function () {
      const editor = capabilities(user(['Editor'])).granted;
      const author = capabilities(user(['Author'])).granted;
      const both = capabilities(user(['Author', 'Editor', 'Author'])).granted;
      assert.deepEqual(both, editor.union(author));
      assert.deepEqual(both, capabilities(user(['Editor', 'Author'])).granted);
      assert.deepEqual(capabilities(user(['Unknown Role'])).granted, new Set());
    });

    it('computes once per principal', function () {
      const principal = user(['Editor']);
      assert.equal(capabilities(principal), capabilities(principal));
    });

    it('does not give an integration key the Owner bypass', function () {
      assert.equal(capabilities(integration('Owner')).granted.size, 0);
    });

    it('grants a content key and an anonymous request nothing', function () {
      assert.equal(capabilities(integration(null)).granted.size, 0);
      assert.equal(capabilities({ kind: 'anonymous' }).granted.size, 0);
    });

    it('grants an app with no user exactly its scopes', function () {
      const app = capabilities(appPrincipal(null, ['post:read']));
      assert.deepEqual([...app.granted], ['post:read']);
      assert.deepEqual(app.scopes, new Set(['post:read']));
    });

    it('grants an app acting for a user that user’s grants, capped by its scopes', function () {
      const app = capabilities(appPrincipal(['Editor'], ['post:read']));
      assert.deepEqual(app.granted, capabilities(user(['Editor'])).granted);
      assert.deepEqual(app.scopes, new Set(['post:read']));
    });

    it('expands a wildcard scope to every action of its type', function () {
      const { scopes } = capabilities(integration(null, ['webhook:*', 'tag:read', 'nope:*']));
      assert.deepEqual(
        scopes,
        new Set(['webhook:add', 'webhook:edit', 'webhook:destroy', 'tag:read']),
      );
      assert.deepEqual(
        [...capabilities(appPrincipal(null, ['webhook:*'])).granted],
        ['webhook:add', 'webhook:edit', 'webhook:destroy'],
      );
    });

    it('gives a whole wildcard only; extra fields grant nothing', function () {
      const { scopes } = capabilities(integration(null, ['post:*:extra', 'post:edit:extra']));
      assert.deepEqual(scopes, new Set(['post:*:extra', 'post:edit:extra']));
      assert.equal(scopesAllow(scopes, 'post:edit'), false);
    });

    it('allows an app nothing when its scopes are missing', function () {
      const actingForOwner = capabilities(appPrincipal(['Owner'], undefined));
      assert.deepEqual(actingForOwner.scopes, new Set());
      assert.deepEqual(capabilities(appPrincipal(null, undefined)).granted, new Set());
    });

    it('grants and allows nothing to a principal of a kind it does not know', function () {
      const unknown = { kind: 'service', user: userView(['Owner']) } as unknown as Principal;
      assert.deepEqual(capabilities(unknown), { granted: new Set(), scopes: new Set() });
    });

    it('scopes a token principal by its scopes', function () {
      assert.deepEqual(capabilities(user(['Owner'], ['tag:edit'])).scopes, new Set(['tag:edit']));
      assert.deepEqual(capabilities(integration(null, [])).scopes, new Set());
    });
  });

  describe('scopes', function () {
    it('allows everything when unlimited', function () {
      assert.equal(scopesAllow('unlimited', 'db:deleteAllContent'), true);
    });

    it('allows only listed keys when scoped', function () {
      assert.equal(scopesAllow(new Set(['post:read']), 'post:read'), true);
      assert.equal(scopesAllow(new Set(['post:read']), 'post:edit'), false);
    });
  });

  describe('authorize', function () {
    it('lets an internal request through', async function () {
      assert.deepEqual(await authorize({ kind: 'internal' }, 'edit', 'post'), {});
    });

    it('allows a granted, unscoped key', async function () {
      assert.deepEqual(await authorize(user(['Editor']), 'publish', 'post'), {});
    });

    it('refuses a key that is not granted', async function () {
      await assert.rejects(authorize(user(['Author']), 'edit', 'setting'), noPermission);
      await assert.rejects(authorize({ kind: 'anonymous' }, 'browse', 'post'), noPermission);
    });

    it('refuses a granted key the scopes lack, even for Owner', async function () {
      const owner = user(['Owner'], ['tag:read']);
      assert.deepEqual(await authorize(owner, 'read', 'tag'), {});
      await assert.rejects(authorize(owner, 'edit', 'tag'), noPermission);
    });

    it('refuses an app acting for an Owner when its scopes are missing', async function () {
      await assert.rejects(
        authorize(appPrincipal(['Owner'], undefined), 'read', 'tag'),
        noPermission,
      );
    });

    it('refuses a principal of a kind it does not know', async function () {
      const unknown = { kind: 'service', user: userView(['Owner']) } as unknown as Principal;
      await assert.rejects(authorize(unknown, 'browse', 'post'), noPermission);
    });

    it('has no row rules yet', function () {
      assert.deepEqual(Object.keys(rowRules), []);
    });
  });
});
