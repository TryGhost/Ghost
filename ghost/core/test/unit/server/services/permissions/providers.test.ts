import assert from 'node:assert/strict';
import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import testUtils from '../../../../utils';
// @ts-expect-error This module lacks type definitions.
import models from '../../../../../core/server/models';
// @ts-expect-error This module lacks type definitions.
import providers from '../../../../../core/server/services/permissions/providers';
// @ts-expect-error This module lacks type definitions.
import rolePermissions from '../../../../../core/server/services/permissions/role-permissions';

describe('Permission Providers', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('User', function () {
    it('errors if user cannot be found', async function () {
      const findUserSpy = sinon.stub(models.User, 'findOne').callsFake(function () {
        return Promise.resolve();
      });

      await assert.rejects(
        async () => {
          await providers.user(1);
        },
        {
          errorType: 'NotFoundError',
        },
      );
      sinon.assert.calledOnce(findUserSpy);
    });

    it("loads permissions from the map for the user's role names", async function () {
      const findUserSpy = sinon.stub(models.User, 'findOne').callsFake(function () {
        const fakeUser = models.User.forge(testUtils.DataGenerator.Content.users[0]);
        fakeUser.set('status', 'active');

        // roles[0] === Administrator
        const fakeRoles = models.Roles.forge([testUtils.DataGenerator.Content.roles[0]]);
        fakeUser.relations = {roles: fakeRoles};
        fakeUser.withRelated = ['roles'];

        return Promise.resolve(fakeUser);
      });

      const res = await providers.user(1);

      sinon.assert.calledOnce(findUserSpy);
      // Only roles are loaded from the database now
      assert.deepEqual(findUserSpy.firstCall.args[1], {withRelated: ['roles']});

      // Permissions come from the in-memory map, keyed by the user's role names
      assert.deepEqual(res.permissions, rolePermissions.forRoles(['Administrator']));
      assert(res.permissions.length > 0);

      // Roles are still returned as JSON (models/user.js reads roles[0].id)
      assert(Array.isArray(res.roles));
      assert.equal(res.roles.length, 1);
      assert.equal(res.roles[0].name, 'Administrator');
      assert('id' in res.roles[0]);
      assert(!(res.roles[0] instanceof models.Base.Model));
    });

    it('throws when user with non-active status is loaded', async function () {
      const findUserSpy = sinon.stub(models.User, 'findOne').callsFake(function () {
        const fakeUser = models.User.forge(testUtils.DataGenerator.Content.users[0]);
        fakeUser.set('status', 'locked');

        return Promise.resolve(fakeUser);
      });

      await assert.rejects(
        async () => {
          await providers.user(1);
        },
        {
          errorType: 'UnauthorizedError',
        },
      );
      sinon.assert.calledOnce(findUserSpy);
    });
  });

  describe('API Key', function () {
    it('errors if api_key cannot be found', async function () {
      const findApiKeySpy = sinon.stub(models.ApiKey, 'findOne');
      findApiKeySpy.returns(Promise.resolve());

      await assert.rejects(
        async () => {
          await providers.apiKey(1);
        },
        {
          errorType: 'NotFoundError',
        },
      );
      sinon.assert.calledOnce(findApiKeySpy);
    });

    it('loads permissions from the map for the api key role name', async function () {
      const findApiKeySpy = sinon.stub(models.ApiKey, 'findOne').callsFake(function () {
        const fakeApiKey = models.ApiKey.forge(testUtils.DataGenerator.Content.api_keys[0]);
        // roles[5] === Admin Integration
        const fakeRole = models.Role.forge(testUtils.DataGenerator.Content.roles[5]);
        fakeApiKey.relations = {role: fakeRole};
        fakeApiKey.withRelated = ['role'];
        return Promise.resolve(fakeApiKey);
      });

      const res = await providers.apiKey(1);

      sinon.assert.calledOnce(findApiKeySpy);
      assert.deepEqual(findApiKeySpy.firstCall.args[1], {withRelated: ['role']});
      assert.deepEqual(res.permissions, rolePermissions.forRoles(['Admin Integration']));
      assert(res.permissions.length > 0);
      assert(Array.isArray(res.roles));
      assert.equal(res.roles.length, 1);
      assert.equal(res.roles[0].name, 'Admin Integration');
    });

    it('returns no permissions when the api key has no role', async function () {
      const findApiKeySpy = sinon.stub(models.ApiKey, 'findOne').callsFake(function () {
        const fakeApiKey = models.ApiKey.forge(testUtils.DataGenerator.Content.api_keys[0]);
        // No role relation
        fakeApiKey.relations = {};
        fakeApiKey.withRelated = ['role'];
        return Promise.resolve(fakeApiKey);
      });

      const res = await providers.apiKey(1);

      sinon.assert.calledOnce(findApiKeySpy);
      assert.deepEqual(res.permissions, []);
      assert.deepEqual(res.roles, [undefined]);
    });
  });
});
