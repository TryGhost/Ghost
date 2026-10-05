import assert from 'node:assert/strict';
import type { StaticPermission } from '../../../core/server/services/permissions/policy';

const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const { knex } = require('../../../core/server/data/db');
const permissions = require('../../../core/server/services/permissions');
const providers = require('../../../core/server/services/permissions/providers');
const policy = require('../../../core/server/services/permissions/policy');

const internal = { context: { internal: true } };

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
    await permissions.init();
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
