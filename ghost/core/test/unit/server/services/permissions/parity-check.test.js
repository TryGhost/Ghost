const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const models = require('../../../../../core/server/models');
const rolePermissions = require('../../../../../core/server/services/permissions/role-permissions');
const parityCheck = require('../../../../../core/server/services/permissions/parity-check');

// Build a fake Bookshelf-ish Role whose related permissions expose .get()
function fakeRole(name, pairs) {
  return {
    get: (field) => (field === 'name' ? name : undefined),
    related: () =>
      ({
        models: pairs.map((pair) => ({
          get: (field) => (field === 'action_type' ? pair.action_type : pair.object_type),
        })),
      }),
  };
}

function fakePermission(pair) {
  return {
    get: (field) => (field === 'action_type' ? pair.action_type : pair.object_type),
  };
}

describe('Permissions parity check', function () {
  let infoStub;
  let errorStub;

  beforeEach(function () {
    infoStub = sinon.stub(logging, 'info');
    errorStub = sinon.stub(logging, 'error');
    // Default: the database agrees with the map; individual tests override.
    sinon.stub(parityCheck, 'countPermissionsUsers').resolves(0);
    sinon.stub(models.Permission, 'findAll').callsFake(() =>
      Promise.resolve({
        models: rolePermissions.all().map(fakePermission),
      }),
    );
  });

  afterEach(function () {
    sinon.restore();
  });

  function stubRoles(roles) {
    sinon.stub(models.Role, 'findAll').callsFake(() => Promise.resolve({ models: roles }));
  }

  it('logs an info line when the database matches the map', async function () {
    stubRoles([fakeRole('Author', rolePermissions.forRoles(['Author']))]);

    await parityCheck.checkParity();

    sinon.assert.calledOnce(infoStub);
    sinon.assert.notCalled(errorStub);
  });

  it('reports a permission present in the database but not the map (wouldRevoke)', async function () {
    const authorPerms = rolePermissions.forRoles(['Author']);
    stubRoles([
      fakeRole('Author', [...authorPerms, { action_type: 'frobnicate', object_type: 'widget' }]),
    ]);

    await parityCheck.checkParity();

    sinon.assert.notCalled(infoStub);
    sinon.assert.calledOnce(errorStub);
    const err = errorStub.firstCall.args[0];
    assert.equal(err.code, 'PERMISSIONS_PARITY_MISMATCH');
    assert.deepEqual(err.errorDetails.roleDiffs[0].wouldRevoke, ['frobnicate:widget']);
  });

  it('reports a permission present in the map but not the database (wouldGrant)', async function () {
    const authorPerms = rolePermissions.forRoles(['Author']);
    // Drop one permission from the database copy
    stubRoles([fakeRole('Author', authorPerms.slice(1))]);

    await parityCheck.checkParity();

    sinon.assert.calledOnce(errorStub);
    const err = errorStub.firstCall.args[0];
    assert.equal(err.code, 'PERMISSIONS_PARITY_MISMATCH');
    const dropped = `${authorPerms[0].action_type}:${authorPerms[0].object_type}`;
    assert.deepEqual(err.errorDetails.roleDiffs[0].wouldGrant, [dropped]);
  });

  it('reports a database role the map does not know', async function () {
    stubRoles([fakeRole('Ghostbuster', [{ action_type: 'bust', object_type: 'ghost' }])]);

    await parityCheck.checkParity();

    sinon.assert.calledOnce(errorStub);
    const err = errorStub.firstCall.args[0];
    assert.equal(err.code, 'PERMISSIONS_PARITY_MISMATCH');
    assert.deepEqual(err.errorDetails.unknownRoles, ['Ghostbuster']);
  });

  it('skips the Owner role', async function () {
    stubRoles([fakeRole('Owner', [{ action_type: 'edit', object_type: 'post' }])]);

    await parityCheck.checkParity();

    sinon.assert.calledOnce(infoStub);
    sinon.assert.notCalled(errorStub);
  });

  it('reports rows in permissions_users', async function () {
    parityCheck.countPermissionsUsers.restore();
    sinon.stub(parityCheck, 'countPermissionsUsers').resolves(3);
    stubRoles([fakeRole('Author', rolePermissions.forRoles(['Author']))]);

    await parityCheck.checkParity();

    sinon.assert.calledOnce(errorStub);
    const err = errorStub.firstCall.args[0];
    assert.equal(err.code, 'PERMISSIONS_PARITY_MISMATCH');
    assert.equal(err.errorDetails.permissionsUsersCount, 3);
  });

  it('swallows a thrown error instead of propagating it', async function () {
    sinon.stub(models.Role, 'findAll').rejects(new Error('database is on fire'));

    await assert.doesNotReject(parityCheck.checkParity());

    sinon.assert.calledOnce(errorStub);
  });
});
