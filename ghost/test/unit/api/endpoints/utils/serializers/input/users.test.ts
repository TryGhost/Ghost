import assert from 'node:assert/strict';
import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import urlService from '../../../../../../../core/server/services/url';
// @ts-expect-error This module lacks type definitions.
import serializers from '../../../../../../../core/server/api/endpoints/utils/serializers';

describe('Unit: endpoints/utils/serializers/input/users', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('browse', function () {
    it('forces the required author columns into the fetch when url is requested', function () {
      // Staff users route through the authors router types; without
      // this, `?fields=url` strips the permalink columns (slug) and the
      // lazy URL service generates /author/undefined/.
      sinon
        .stub(Object.getPrototypeOf(urlService), 'getRequiredFields')
        .withArgs('authors')
        .returns(['slug']);
      const frame = { options: { columns: ['url', 'id'] } };

      serializers.input.users.browse({}, frame);

      assert.deepEqual(frame.options.columns, ['url', 'id', 'slug']);
    });
  });

  describe('read', function () {
    it('forces the required author columns into the fetch when url is requested', function () {
      sinon
        .stub(Object.getPrototypeOf(urlService), 'getRequiredFields')
        .withArgs('authors')
        .returns(['slug']);
      const frame = { data: {}, options: { columns: ['url', 'id'] } };

      serializers.input.users.read({}, frame);

      assert.deepEqual(frame.options.columns, ['url', 'id', 'slug']);
    });
  });

  describe('permission includes', function () {
    for (const method of ['browse', 'read', 'edit'] as const) {
      it(`${method} takes permissions and roles.permissions off withRelated`, function () {
        const frame: Record<string, any> = {
          data: { users: [{}] },
          options: { withRelated: ['count.posts', 'permissions', 'roles', 'roles.permissions'] },
        };

        serializers.input.users[method]({}, frame);

        assert.deepEqual(frame.options.withRelated, ['count.posts', 'roles']);
        assert.deepEqual(frame.permissionIncludes, { permissions: true, rolePermissions: true });
      });
    }

    it('loads roles when only roles.permissions is requested', function () {
      const frame: Record<string, any> = {
        data: {},
        options: { withRelated: ['roles.permissions'] },
      };

      serializers.input.users.read({}, frame);

      assert.deepEqual(frame.options.withRelated, ['roles']);
      assert.deepEqual(frame.permissionIncludes, { permissions: false, rolePermissions: true });
    });

    it('leaves other includes alone', function () {
      const frame: Record<string, any> = {
        data: {},
        options: { withRelated: ['roles', 'count.posts'] },
      };

      serializers.input.users.read({}, frame);

      assert.deepEqual(frame.options.withRelated, ['roles', 'count.posts']);
      assert.equal(frame.permissionIncludes, undefined);
    });
  });
});
