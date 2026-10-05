import assert from 'node:assert/strict';
import sinon from 'sinon';
import { z } from 'zod';
import type { StaticPermission } from '../../../core/server/services/permissions/policy';

const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const { knex } = require('../../../core/server/data/db');
const permissions = require('../../../core/server/services/permissions');
const providers = require('../../../core/server/services/permissions/providers');
const policy = require('../../../core/server/services/permissions/policy');

const internal = { context: { internal: true } };

function grantKeys(grants: readonly StaticPermission[]) {
  return grants.map((grant) =>
    JSON.stringify([
      grant.get('action_type'),
      grant.get('object_type'),
      grant.get('object_id') ?? null,
    ]),
  );
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

describe('In-memory permission policy', function () {
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

  it('uses memory for every built-in seeded role', async function () {
    const config = require('../../../core/shared/config');
    const fixtures = require(config.get('paths').fixtures);
    const builtInNames = new Set(
      fixtures.models
        .find((model: { name: string }) => model.name === 'Role')
        .entries.map((role: { name: string }) => role.name),
    );
    const roles = await models.Role.findAll();
    for (const role of roles.models) {
      if (builtInNames.has(role.get('name'))) {
        assert.notEqual(policy.permissionsForRole(role.id, role.get('name')), undefined);
      }
    }
  });

  it('matches legacy database grants and tag authorization for every built-in role', async function () {
    const roles = await models.Role.findAll();
    const user = await createUser('Contributor');
    const originalRole = await knex('roles_users').where({ user_id: user.id }).first();
    const key = await models.ApiKey.add({ type: 'admin' }, internal);
    try {
      for (const role of roles.models) {
        if (policy.permissionsForRole(role.id, role.get('name')) === undefined) {
          continue;
        }
        await knex('roles_users').where({ user_id: user.id }).update({ role_id: role.id });
        await knex('api_keys').where({ id: key.id }).update({ role_id: role.id });

        // Independently load the previous eager relations as the reference.
        // This does not use the new compiler or its database fallback branch.
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
                .models.flatMap(
                  (entry: { related: (name: string) => { models: StaticPermission[] } }) =>
                    entry.related('permissions').models,
                )
                .concat(legacyUser.related('permissions').models),
              roles: legacyUser.toJSON().roles,
            },
          },
          {
            provider: 'apiKey' as const,
            id: key.id,
            context: { api_key: { id: key.id, type: 'admin' } },
            result: {
              permissions: legacyKey.related('role').related('permissions').models,
              roles: [legacyKey.toJSON().role],
            },
          },
        ];
        for (const reference of references) {
          const current = await providers[reference.provider](reference.id);
          const expectedGrants = [...new Set(grantKeys(reference.result.permissions))].sort();
          assert.deepEqual(grantKeys(current.permissions).sort(), expectedGrants, role.get('name'));
          const roleIdentities = (entries: Array<{ id: string; name: string }>) =>
            entries.map(({ id, name }) => ({ id, name }));
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
    } finally {
      await knex('roles_users')
        .where({ user_id: user.id })
        .update({ role_id: originalRole.role_id });
      await models.ApiKey.destroy({ ...internal, id: key.id });
    }
  });

  it('batches custom role grants and deduplicates overlapping direct grants', async function () {
    const user = await createUser('Contributor');
    const firstRole = await models.Role.add({ name: 'First custom role' }, internal);
    const secondRole = await models.Role.add({ name: 'Second custom role' }, internal);
    const permission = await models.Permission.findOne({ action_type: 'edit', object_type: 'tag' });
    await knex('roles_users').insert(
      [firstRole, secondRole].map((role) => ({
        id: models.Role.generateId(),
        user_id: user.id,
        role_id: role.id,
      })),
    );
    await knex('permissions_roles').insert(
      [firstRole, secondRole].map((role) => ({
        id: models.Permission.generateId(),
        role_id: role.id,
        permission_id: permission.id,
      })),
    );
    await knex('permissions_users').insert({
      id: models.Permission.generateId(),
      user_id: user.id,
      permission_id: permission.id,
    });
    try {
      const { result, queries } = await captureQueries<{ permissions: StaticPermission[] }>(() =>
        providers.user(user.id),
      );
      assert.equal(queries.length, 4);
      assert.equal(queries.filter((sql) => sql.includes('permissions_roles')).length, 1);
      assert.equal(
        result.permissions.filter(
          (grant) => grant.get('action_type') === 'edit' && grant.get('object_type') === 'tag',
        ).length,
        1,
      );
      await permissions.canThis({ user: user.id }).edit.tag();
      await user.permissions().detach(permission.id);
      await firstRole.permissions().detach(permission.id);
      await permissions.canThis({ user: user.id }).edit.tag();
      await secondRole.permissions().detach(permission.id);
      await assert.rejects(() => permissions.canThis({ user: user.id }).edit.tag(), {
        errorType: 'NoPermissionError',
      });
    } finally {
      await user.permissions().detach(permission.id);
      await knex('roles_users')
        .where({ user_id: user.id })
        .whereIn('role_id', [firstRole.id, secondRole.id])
        .del();
      await models.Role.destroy({ ...internal, id: firstRole.id });
      await models.Role.destroy({ ...internal, id: secondRole.id });
    }
  });

  it('avoids role-grant queries while keeping staff identity and direct grants current', async function () {
    const user = await createUser('Administrator');
    const { result, queries } = await captureQueries<{ permissions: StaticPermission[] }>(() =>
      providers.user(user.id),
    );
    assert.equal(queries.length, 3);
    assert(queries.every((sql) => !sql.includes('permissions_roles')));
    assert(
      result.permissions.some(
        (permission) =>
          permission.get('action_type') === 'edit' && permission.get('object_type') === 'tag',
      ),
    );
  });

  it('avoids role-grant queries for integration keys and observes deletion', async function () {
    const integration = await models.Integration.add({ name: 'Permission test' }, internal);
    const key = await models.ApiKey.add(
      { type: 'admin', integration_id: integration.id },
      internal,
    );
    const { queries } = await captureQueries(() => providers.apiKey(key.id));
    assert.equal(queries.length, 2);
    assert(queries.every((sql) => !sql.includes('permissions')));
    await models.ApiKey.destroy({ ...internal, id: key.id });
    await assert.rejects(() => providers.apiKey(key.id), { errorType: 'NotFoundError' });
  });

  it('observes demotion and suspension without rebuilding the policy', async function () {
    const user = await createUser('Administrator');
    await permissions.canThis({ user: user.id }).edit.tag();
    await models.User.edit({ roles: ['Contributor'] }, { ...internal, id: user.id });
    await assert.rejects(() => permissions.canThis({ user: user.id }).edit.tag(), {
      errorType: 'NoPermissionError',
    });
    await models.User.edit({ status: 'inactive' }, { ...internal, id: user.id });
    await assert.rejects(() => providers.user(user.id), { errorType: 'UnauthorizedError' });
  });

  it('observes direct user grant additions and removals without rebuilding the policy', async function () {
    const user = await createUser('Contributor');
    const permission = await models.Permission.findOne({ action_type: 'edit', object_type: 'tag' });
    await assert.rejects(() => permissions.canThis({ user: user.id }).edit.tag(), {
      errorType: 'NoPermissionError',
    });
    await knex('permissions_users').insert({
      id: models.Permission.generateId(),
      user_id: user.id,
      permission_id: permission.id,
    });
    await permissions.canThis({ user: user.id }).edit.tag();
    await user.permissions().detach(permission.id);
    await assert.rejects(() => permissions.canThis({ user: user.id }).edit.tag(), {
      errorType: 'NoPermissionError',
    });
  });

  it('keeps unknown roles on the live database path', async function () {
    const role = await models.Role.add({ name: 'Custom permission test' }, internal);
    const permission = await models.Permission.findOne({ action_type: 'edit', object_type: 'tag' });
    const key = await models.ApiKey.add({ type: 'admin' }, internal);
    // The model assigns the standard integration role; exercise an existing
    // custom assignment as found in a restored or customized database.
    await knex('api_keys').where({ id: key.id }).update({ role_id: role.id });
    await knex('permissions_roles').insert({
      id: models.Permission.generateId(),
      role_id: role.id,
      permission_id: permission.id,
    });
    await permissions.canThis({ api_key: { id: key.id, type: 'admin' } }).edit.tag();
    await role.permissions().detach(permission.id);
    await assert.rejects(
      () => permissions.canThis({ api_key: { id: key.id, type: 'admin' } }).edit.tag(),
      { errorType: 'NoPermissionError' },
    );
    await models.ApiKey.destroy({ ...internal, id: key.id });
    await models.Role.destroy({ ...internal, id: role.id });
  });

  it('preserves revoked grants on a built-in role after boot reconciliation', async function () {
    const role = await models.Role.findOne({ name: 'Administrator' });
    const permission = await models.Permission.findOne({ action_type: 'edit', object_type: 'tag' });
    const user = await createUser('Administrator');
    const relation = await knex('permissions_roles')
      .where({ role_id: role.id, permission_id: permission.id })
      .first();
    assert(relation);
    await role.permissions().detach(permission.id);
    try {
      await permissions.init();
      assert.equal(policy.permissionsForRole(role.id, role.get('name')), undefined);
      await assert.rejects(() => permissions.canThis({ user: user.id }).edit.tag(), {
        errorType: 'NoPermissionError',
      });
      await knex('permissions_roles').insert(relation);
      await permissions.canThis({ user: user.id }).edit.tag();
    } finally {
      const attached = await role.permissions().fetch();
      if (!attached.get(permission.id)) {
        await knex('permissions_roles').insert(relation);
      }
      await permissions.init();
    }
  });
});
