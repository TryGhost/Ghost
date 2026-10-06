import assert from 'node:assert/strict';
import sinon from 'sinon';

const providers: typeof import('../../../../../core/server/services/permissions/permission-providers').providers = require('../../../../../core/server/services/permissions/providers');
const rolePermissions: typeof import('../../../../../core/server/services/permissions/role-permissions') = require('../../../../../core/server/services/permissions/role-permissions');
const models = require('../../../../../core/server/models');
const testUtils = require('../../../../utils');

describe('Permission Providers', function () {
  beforeEach(function () {
    rolePermissions.init();
  });
  afterEach(function () {
    sinon.restore();
  });

  function fakeUser(names = ['Administrator']) {
    const user = models.User.forge({
      ...testUtils.DataGenerator.Content.users[0],
      status: 'active',
    });
    user.relations = {
      roles: models.Roles.forge(
        names.map((name, index) => ({
          id: `role-${index}`,
          name,
          description: 'Role description',
        })),
      ),
    };
    user.withRelated = ['roles'];
    return user;
  }

  it('loads live user roles and returns plain, immutable policy grants', async function () {
    const find = sinon.stub(models.User, 'findOne').resolves(fakeUser());
    const result = await providers.user('user-id');
    sinon.assert.calledOnceWithExactly(find, { id: 'user-id' }, { withRelated: ['roles'] });
    assert.deepEqual(result.permissions, rolePermissions.forRoles(['Administrator']));
    assert(Object.isFrozen(result.permissions));
    assert(Object.isFrozen(result.permissions[0]));
    assert(!('get' in result.permissions[0]));
    assert.deepEqual(result.roles, [
      { id: 'role-0', name: 'Administrator', description: 'Role description' },
    ]);
  });

  it('unions multiple roles and gives unknown roles no grants', async function () {
    const find = sinon
      .stub(models.User, 'findOne')
      .resolves(fakeUser(['Editor', 'Author', 'Unknown']));
    const result = await providers.user('user-id');
    assert.deepEqual(result.permissions, rolePermissions.forRoles(['Editor', 'Author']));
    assert.equal(result.roles.length, 3);
    find.resolves(fakeUser(['Unknown']));
    assert.deepEqual((await providers.user('user-id')).permissions, []);
  });

  it('rejects missing and inactive users before consulting policy', async function () {
    const find = sinon.stub(models.User, 'findOne').resolves(undefined);
    const policy = sinon.spy(rolePermissions.RolePermissions.prototype, 'forRoles');
    await assert.rejects(() => providers.user('missing'), { errorType: 'NotFoundError' });
    const user = fakeUser();
    user.set('status', 'locked');
    find.resolves(user);
    await assert.rejects(() => providers.user('locked'), { errorType: 'UnauthorizedError' });
    sinon.assert.notCalled(policy);
  });

  it('loads a live key role and preserves its full JSON', async function () {
    const key = models.ApiKey.forge(testUtils.DataGenerator.Content.api_keys[0]);
    key.relations = {
      role: models.Role.forge({
        id: 'role-id',
        name: 'Admin Integration',
        description: 'Integration',
      }),
    };
    key.withRelated = ['role'];
    const find = sinon.stub(models.ApiKey, 'findOne').resolves(key);
    const result = await providers.apiKey('key-id');
    sinon.assert.calledOnceWithExactly(find, { id: 'key-id' }, { withRelated: ['role'] });
    assert.deepEqual(result.permissions, rolePermissions.forRoles(['Admin Integration']));
    assert.deepEqual(result.roles, [
      { id: 'role-id', name: 'Admin Integration', description: 'Integration' },
    ]);
  });

  it('returns no grants for a key with no role', async function () {
    const key = models.ApiKey.forge(testUtils.DataGenerator.Content.api_keys[0]);
    key.relations = { role: models.Role.forge() };
    key.withRelated = ['role'];
    const find = sinon.stub(models.ApiKey, 'findOne').resolves(key);
    assert.deepEqual(await providers.apiKey('key-id'), { permissions: [], roles: [{}] });
    find.resolves({ toJSON: () => ({ role: undefined }) });
    assert.deepEqual(await providers.apiKey('key-id'), { permissions: [], roles: [undefined] });
  });

  it('rejects a missing key', async function () {
    sinon.stub(models.ApiKey, 'findOne').resolves(undefined);
    await assert.rejects(() => providers.apiKey('missing'), { errorType: 'NotFoundError' });
  });
});
