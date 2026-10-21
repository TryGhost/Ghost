import assert from 'node:assert/strict';
import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import urlService from '../../../../../../../../../core/server/services/url';
// @ts-expect-error This module lacks type definitions.
import usersMapper from '../../../../../../../../../core/server/api/endpoints/utils/serializers/output/mappers/users';
import * as rolePermissions from '../../../../../../../../../core/server/services/permissions/role-permissions';

describe('Unit: endpoints/utils/serializers/output/mappers/users', function () {
  beforeEach(function () {
    sinon.stub(urlService, 'getUrlForResource').returns('https://example.com/author/joe/');
  });

  afterEach(function () {
    sinon.restore();
  });

  function makeUser(roles: { id: string; name: string }[]) {
    return { id: 'user-1', slug: 'joe', name: 'Joe', roles };
  }

  function makeFrame(permissionIncludes?: { permissions: boolean; rolePermissions: boolean }) {
    return { apiType: 'admin', options: { context: { user: 'user-1' } }, permissionIncludes };
  }

  it('fills role permissions from the role map', function () {
    const user = usersMapper(
      makeUser([{ id: 'role-1', name: 'Editor' }]),
      makeFrame({ permissions: false, rolePermissions: true }),
    );

    const expected = rolePermissions.forRoles(['Editor']).map((perm) => ({
      action_type: perm.action_type,
      object_type: perm.object_type,
      object_id: null,
    }));

    assert(expected.length > 0);
    assert.deepEqual(user.roles[0].permissions, expected);
    assert.equal(user.roles[0].name, 'Editor');
    assert.equal(user.permissions, undefined);
  });

  it('gives Owner an empty role permissions list', function () {
    const user = usersMapper(
      makeUser([{ id: 'role-1', name: 'Owner' }]),
      makeFrame({ permissions: false, rolePermissions: true }),
    );

    assert.deepEqual(user.roles[0].permissions, []);
  });

  it('gives an empty list for direct user permissions', function () {
    const user = usersMapper(
      makeUser([{ id: 'role-1', name: 'Administrator' }]),
      makeFrame({ permissions: true, rolePermissions: false }),
    );

    assert.deepEqual(user.permissions, []);
    assert.equal(user.roles[0].permissions, undefined);
  });

  it('adds no permissions when they were not requested', function () {
    const user = usersMapper(makeUser([{ id: 'role-1', name: 'Administrator' }]), makeFrame());

    assert.equal(user.permissions, undefined);
    assert.equal(user.roles[0].permissions, undefined);
  });
});
