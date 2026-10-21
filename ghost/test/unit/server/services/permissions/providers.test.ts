import assert from 'node:assert/strict';
import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import testUtils from '../../../../utils';
// @ts-expect-error This module lacks type definitions.
import models from '../../../../../core/server/models';
// @ts-expect-error This module lacks type definitions.
import providers from '../../../../../core/server/services/permissions/providers';
import * as rolePermissions from '../../../../../core/server/services/permissions/role-permissions';

const { roles, users, api_keys: apiKeys } = testUtils.DataGenerator.Content;

const toKeys = (permissions: { action_type: string; object_type: string }[]) =>
  permissions.map((perm) => `${perm.action_type}:${perm.object_type}`).sort();

function fakeUserWithRoles(roleFixtures: object[], status = 'active') {
  const fakeUser = models.User.forge(users[0]);
  fakeUser.set('status', status);
  fakeUser.relations = { roles: models.Roles.forge(roleFixtures) };
  // We use this inside toJSON.
  fakeUser.withRelated = ['roles'];

  return fakeUser;
}

describe('Permission Providers', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('User', function () {
    it('errors if user cannot be found', async function () {
      const findUserSpy = sinon.stub(models.User, 'findOne').resolves();

      await assert.rejects(() => providers.user(1), { errorType: 'NotFoundError' });
      sinon.assert.calledOnce(findUserSpy);
    });

    it('loads only the roles relation', async function () {
      const findUserSpy = sinon
        .stub(models.User, 'findOne')
        .resolves(fakeUserWithRoles([roles[0]]));

      await providers.user(1);

      sinon.assert.calledOnceWithExactly(findUserSpy, { id: 1 }, { withRelated: ['roles'] });
    });

    it('takes permissions from the role map for the user role', async function () {
      sinon.stub(models.User, 'findOne').resolves(fakeUserWithRoles([roles[0]]));

      const res = await providers.user(1);

      assert.equal(roles[0].name, 'Administrator');
      assert.deepEqual(
        toKeys(res.permissions),
        toKeys(rolePermissions.forRoles(['Administrator'])),
      );
      assert.equal(res.roles.length, 1);
      assert.equal(res.roles[0].name, 'Administrator');
      assert('id' in res.roles[0]);
      assert(!(res.roles[0] instanceof models.Base.Model));
    });

    it('unions permissions across roles without duplicates', async function () {
      sinon.stub(models.User, 'findOne').resolves(fakeUserWithRoles([roles[1], roles[2]]));

      const res = await providers.user(1);
      const keys = toKeys(res.permissions);

      assert.deepEqual(keys, toKeys(rolePermissions.forRoles(['Editor', 'Author'])));
      assert.equal(new Set(keys).size, keys.length);
    });

    it('gives Owner no permissions of its own', async function () {
      sinon.stub(models.User, 'findOne').resolves(fakeUserWithRoles([roles[3]]));

      const res = await providers.user(1);

      assert.equal(roles[3].name, 'Owner');
      assert.deepEqual(res.permissions, []);
      assert.equal(res.roles[0].name, 'Owner');
    });

    it('throws when user with non-active status is loaded', async function () {
      const findUserSpy = sinon
        .stub(models.User, 'findOne')
        .resolves(fakeUserWithRoles([roles[0]], 'locked'));

      await assert.rejects(() => providers.user(1), { errorType: 'UnauthorizedError' });
      sinon.assert.calledOnce(findUserSpy);
    });
  });

  describe('API Key', function () {
    it('errors if api_key cannot be found', async function () {
      const findApiKeySpy = sinon.stub(models.ApiKey, 'findOne').resolves();

      await assert.rejects(() => providers.apiKey(1), { errorType: 'NotFoundError' });
      sinon.assert.calledOnce(findApiKeySpy);
    });

    it('takes permissions from the role map for the key role', async function () {
      const findApiKeySpy = sinon.stub(models.ApiKey, 'findOne').callsFake(function () {
        const fakeApiKey = models.ApiKey.forge(apiKeys[0]);
        fakeApiKey.relations = { role: models.Role.forge(roles[5]) };
        fakeApiKey.withRelated = ['role'];
        return Promise.resolve(fakeApiKey);
      });

      const res = await providers.apiKey(1);

      sinon.assert.calledOnceWithExactly(findApiKeySpy, { id: 1 }, { withRelated: ['role'] });
      assert.equal(roles[5].name, 'Admin Integration');
      assert.deepEqual(
        toKeys(res.permissions),
        toKeys(rolePermissions.forRoles(['Admin Integration'])),
      );
      assert.equal(res.roles.length, 1);
      assert.equal(res.roles[0].name, 'Admin Integration');
      assert(!(res.roles[0] instanceof models.Base.Model));
    });

    it('gives a content api_key without a role no permissions', async function () {
      sinon.stub(models.ApiKey, 'findOne').callsFake(function () {
        const fakeApiKey = models.ApiKey.forge(apiKeys[1]);
        fakeApiKey.relations = { role: models.Role.forge() };
        fakeApiKey.withRelated = ['role'];
        return Promise.resolve(fakeApiKey);
      });

      const res = await providers.apiKey(1);

      assert.equal(apiKeys[1].type, 'content');
      assert.deepEqual(res.permissions, []);
      assert.equal(res.roles.length, 1);
    });
  });
});
