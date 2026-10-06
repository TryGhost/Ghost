import assert from 'node:assert/strict';
import sinon from 'sinon';
import { z } from 'zod';
import type { Permission } from '../../../core/server/services/permissions/role-permissions';

const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const { knex } = require('../../../core/server/data/db');
const permissions = require('../../../core/server/services/permissions');
const providers: typeof import('../../../core/server/services/permissions/permission-providers').providers = require('../../../core/server/services/permissions/providers');
const rolePermissions: typeof import('../../../core/server/services/permissions/role-permissions') = require('../../../core/server/services/permissions/role-permissions');
const {
  definitions,
}: typeof import('../../../core/server/services/permissions/definitions') = require('../../../core/server/services/permissions/definitions');
const parity: typeof import('../../../core/server/services/permissions/parity-check') = require('../../../core/server/services/permissions/parity-check');

const internal = { context: { internal: true } };

function grantKeys(grants: readonly Permission[]) {
  return grants.map((grant) => JSON.stringify([grant.action_type, grant.object_type]));
}

function databaseGrants(collection: { toJSON: () => unknown }) {
  return z.array(rolePermissions.permissionSchema).parse(collection.toJSON());
}

async function tagDecisions(check: { [action: string]: { tag: () => Promise<unknown> } }) {
  const decisions: Record<string, string> = {};
  for (const action of ['browse', 'read', 'edit', 'add', 'destroy']) {
    try {
      await check[action].tag();
      decisions[action] = 'allowed';
    } catch (error) {
      decisions[action] = z.object({ errorType: z.string() }).parse(error).errorType;
    }
  }
  return decisions;
}

async function captureQueries<T>(operation: () => Promise<T>) {
  const queries: string[] = [];
  const listener = (query: { sql: string }) => queries.push(query.sql);
  knex.on('query', listener);
  try {
    const result = await operation();
    return { result, queries };
  } finally {
    knex.removeListener('query', listener);
  }
}

describe('Authoritative in-memory permission policy', function () {
  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
  });

  async function createUser(role: string) {
    return models.User.add(
      { name: 'Permission test', email: `${models.User.generateId()}@example.com`, roles: [role] },
      internal,
    );
  }

  it('matches legacy database grants and tag authorization for every built-in role', async function () {
    const builtInNames = new Set<string>(definitions.roles);
    const roles = await models.Role.findAll();
    const visited = new Set<string>();
    const user = await createUser('Contributor');
    const originalRole = await knex('roles_users').where({ user_id: user.id }).first();
    const key = await models.ApiKey.add({ type: 'admin' }, internal);
    try {
      for (const role of roles.models) {
        if (!builtInNames.has(role.get('name'))) {
          continue;
        }
        visited.add(role.get('name'));
        await knex('roles_users').where({ user_id: user.id }).update({ role_id: role.id });
        await knex('api_keys').where({ id: key.id }).update({ role_id: role.id });

        // Independently load the previous eager relations as the reference.
        // The reference does not use the new policy compiler.
        const legacyUser = await models.User.findOne(
          { id: user.id },
          { withRelated: ['permissions', 'roles', 'roles.permissions'] },
        );
        const legacyKey = await models.ApiKey.findOne(
          { id: key.id },
          { withRelated: ['role', 'role.permissions'] },
        );
        const references = [
          {
            provider: 'user' as const,
            id: user.id,
            context: { user: user.id },
            result: {
              permissions: legacyUser
                .related('roles')
                .models.flatMap((entry: { related: (name: string) => { toJSON: () => unknown } }) =>
                  databaseGrants(entry.related('permissions')),
                )
                .concat(databaseGrants(legacyUser.related('permissions'))),
              roles: legacyUser.toJSON().roles,
            },
          },
          {
            provider: 'apiKey' as const,
            id: key.id,
            context: { api_key: { id: key.id, type: 'admin' } },
            result: {
              permissions: databaseGrants(legacyKey.related('role').related('permissions')),
              roles: [legacyKey.toJSON().role],
            },
          },
        ];
        for (const reference of references) {
          const current = await providers[reference.provider](reference.id);
          const expectedGrants = [...new Set(grantKeys(reference.result.permissions))].sort();
          assert.deepEqual(grantKeys(current.permissions).sort(), expectedGrants, role.get('name'));
          const roleIdentities = (
            entries: Array<{ id?: string; name?: string } | null | undefined>,
          ) => entries.map((entry) => ({ id: entry?.id, name: entry?.name }));
          assert.deepEqual(roleIdentities(current.roles), roleIdentities(reference.result.roles));

          const memoryDecisions = await tagDecisions(permissions.canThis(reference.context));
          const providerStub = sinon.stub(providers, reference.provider).resolves(reference.result);
          try {
            assert.deepEqual(
              memoryDecisions,
              await tagDecisions(permissions.canThis(reference.context)),
              `${reference.provider}: ${role.get('name')}`,
            );
          } finally {
            providerStub.restore();
          }
        }
      }
      assert.deepEqual([...visited].sort(), [...builtInNames].sort());
    } finally {
      await knex('roles_users')
        .where({ user_id: user.id })
        .update({ role_id: originalRole.role_id });
      await models.ApiKey.destroy({ ...internal, id: key.id });
    }
  });

  it('uses two user queries without reading permission tables', async function () {
    const user = await createUser('Administrator');
    const { result, queries } = await captureQueries(() => providers.user(user.id));
    assert.equal(queries.length, 2);
    assert(queries.every((sql) => !sql.includes('permissions')));
    assert.deepEqual(result.permissions, rolePermissions.forRoles(['Administrator']));
  });

  it('uses two key queries and observes reassignment and deletion', async function () {
    const key = await models.ApiKey.add({ type: 'admin' }, internal);
    try {
      const { queries } = await captureQueries(() => providers.apiKey(key.id));
      assert.equal(queries.length, 2);
      assert(queries.every((sql) => !sql.includes('permissions')));
      const contributor = await models.Role.findOne({ name: 'Contributor' });
      await knex('api_keys').where({ id: key.id }).update({ role_id: contributor.id });
      assert.deepEqual(
        (await providers.apiKey(key.id)).permissions,
        rolePermissions.forRoles(['Contributor']),
      );
      await knex('api_keys').where({ id: key.id }).update({ role_id: null });
      assert.deepEqual(await providers.apiKey(key.id), { permissions: [], roles: [undefined] });
    } finally {
      await models.ApiKey.destroy({ ...internal, id: key.id });
    }
    await assert.rejects(() => providers.apiKey(key.id), { errorType: 'NotFoundError' });
  });

  it('observes demotion and suspension without rebuilding policy', async function () {
    const user = await createUser('Administrator');
    await permissions.canThis({ user: user.id }).edit.tag();
    await models.User.edit({ roles: ['Contributor'] }, { ...internal, id: user.id });
    await assert.rejects(() => permissions.canThis({ user: user.id }).edit.tag(), {
      errorType: 'NoPermissionError',
    });
    await models.User.edit({ status: 'inactive' }, { ...internal, id: user.id });
    await assert.rejects(() => providers.user(user.id), { errorType: 'UnauthorizedError' });
  });

  it('observes user demotion, suspension and key deletion in combined staff checks', async function () {
    const user = await createUser('Administrator');
    const key = await models.ApiKey.add({ type: 'admin', user_id: user.id }, internal);
    const context = { user: user.id, api_key: { id: key.id, type: 'admin' } };
    try {
      const { queries } = await captureQueries(() => permissions.canThis(context).edit.tag());
      assert.equal(queries.length, 4);
      assert(queries.every((sql) => !sql.includes('permissions')));
      await models.User.edit({ roles: ['Contributor'] }, { ...internal, id: user.id });
      await assert.rejects(() => permissions.canThis(context).edit.tag(), {
        errorType: 'NoPermissionError',
      });
      await models.User.edit({ status: 'inactive' }, { ...internal, id: user.id });
      await assert.rejects(() => permissions.canThis(context).edit.tag(), {
        errorType: 'UnauthorizedError',
      });
      await models.User.edit({ status: 'active' }, { ...internal, id: user.id });
    } finally {
      await models.ApiKey.destroy({ ...internal, id: key.id });
    }
    await assert.rejects(() => permissions.canThis(context).read.tag(), {
      errorType: 'NotFoundError',
    });
  });

  it('audits Owner grants used by keys while preserving the Owner user bypass', async function () {
    const user = await createUser('Contributor');
    const originalRole = await knex('roles_users').where({ user_id: user.id }).first();
    const owner = await models.Role.findOne({ name: 'Owner' });
    const permission = await models.Permission.findOne({ action_type: 'edit', object_type: 'tag' });
    const key = await models.ApiKey.add({ type: 'admin' }, internal);
    try {
      await knex('api_keys').where({ id: key.id }).update({ role_id: owner.id });
      await knex('roles_users').where({ user_id: user.id }).update({ role_id: owner.id });
      await knex('permissions_roles').insert({
        id: models.Permission.generateId(),
        role_id: owner.id,
        permission_id: permission.id,
      });
      const legacyKey = await models.ApiKey.findOne(
        { id: key.id },
        { withRelated: ['role', 'role.permissions'] },
      );
      const legacyGrants = databaseGrants(legacyKey.related('role').related('permissions'));
      const grant = { action_type: 'edit', object_type: 'tag' };
      assert.deepEqual(legacyGrants, [grant]);
      const policy = new rolePermissions.RolePermissions();
      const report = parity.compare(policy, {
        roles: [{ id: owner.id, name: 'Owner', permissions: legacyGrants }],
        permissions: databaseGrants(await models.Permission.findAll()),
        directUserGrants: 0,
      });
      assert.equal(report.matches, false);
      assert.deepEqual(report.roles, [
        { id: owner.id, name: 'Owner', wouldGrant: [], wouldRevoke: [grant] },
      ]);
      await permissions.init();
      await permissions.canThis({ user: user.id }).edit.tag();
      await assert.rejects(
        () => permissions.canThis({ api_key: { id: key.id, type: 'admin' } }).edit.tag(),
        { errorType: 'NoPermissionError' },
      );
    } finally {
      await models.ApiKey.destroy({ ...internal, id: key.id });
      await owner.permissions().detach(permission.id);
      await knex('roles_users')
        .where({ user_id: user.id })
        .update({ role_id: originalRole.role_id });
    }
  });

  it('ignores direct grants and extra role grants in the DB', async function () {
    const user = await createUser('Contributor');
    const role = await models.Role.findOne({ name: 'Contributor' });
    const permission = await models.Permission.findOne({ action_type: 'edit', object_type: 'tag' });
    const deny = () =>
      assert.rejects(() => permissions.canThis({ user: user.id }).edit.tag(), {
        errorType: 'NoPermissionError',
      });
    await deny();
    await knex('permissions_users').insert({
      id: models.Permission.generateId(),
      user_id: user.id,
      permission_id: permission.id,
    });
    await knex('permissions_roles').insert({
      id: models.Permission.generateId(),
      role_id: role.id,
      permission_id: permission.id,
    });
    try {
      await deny();
      await permissions.init();
      await deny();
    } finally {
      await user.permissions().detach(permission.id);
      await role.permissions().detach(permission.id);
    }
  });

  it('uses fixture grants even when a built-in DB grant is missing at boot', async function () {
    const user = await createUser('Administrator');
    const role = await models.Role.findOne({ name: 'Administrator' });
    const permission = await models.Permission.findOne({ action_type: 'edit', object_type: 'tag' });
    const relation = await knex('permissions_roles')
      .where({ role_id: role.id, permission_id: permission.id })
      .first();
    assert(relation);
    await role.permissions().detach(permission.id);
    try {
      await permissions.init();
      await permissions.canThis({ user: user.id }).edit.tag();
    } finally {
      await knex('permissions_roles').insert(relation);
    }
  });

  it('gives unknown role names no grants despite their DB mapping', async function () {
    const role = await models.Role.add({ name: 'Custom permission test' }, internal);
    const permission = await models.Permission.findOne({ action_type: 'edit', object_type: 'tag' });
    const key = await models.ApiKey.add({ type: 'admin' }, internal);
    try {
      await knex('api_keys').where({ id: key.id }).update({ role_id: role.id });
      await knex('permissions_roles').insert({
        id: models.Permission.generateId(),
        role_id: role.id,
        permission_id: permission.id,
      });
      await assert.rejects(
        () => permissions.canThis({ api_key: { id: key.id, type: 'admin' } }).edit.tag(),
        { errorType: 'NoPermissionError' },
      );
      assert.deepEqual((await providers.apiKey(key.id)).permissions, []);
    } finally {
      await models.ApiKey.destroy({ ...internal, id: key.id });
      await role.permissions().detach(permission.id);
      await models.Role.destroy({ ...internal, id: role.id });
    }
  });
});
