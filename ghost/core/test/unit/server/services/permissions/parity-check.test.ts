import assert from 'node:assert/strict';
import logging from '@tryghost/logging';
import sinon from 'sinon';

const {
  RolePermissions,
}: typeof import('../../../../../core/server/services/permissions/role-permissions') = require('../../../../../core/server/services/permissions/role-permissions');
const {
  check,
  compare,
}: typeof import('../../../../../core/server/services/permissions/parity-check') = require('../../../../../core/server/services/permissions/parity-check');
const config = require('../../../../../core/shared/config');
const policy = new RolePermissions(require(config.get('paths').fixtures));

function snapshot() {
  return {
    roles: [
      { id: 'reader', name: 'Contributor', permissions: [...policy.forRoles(['Contributor'])] },
    ],
    permissions: [...policy.all()],
    directUserGrants: 0,
  };
}

describe('Permission parity audit', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('compares sets independent of row ordering and duplicates', function () {
    const input = snapshot();
    input.roles[0].permissions.reverse();
    input.roles[0].permissions.push(input.roles[0].permissions[0]);
    assert.equal(compare(policy, input).matches, true);
  });

  it('reports grants, revocations, catalog drift, direct grants and DB-only roles', function () {
    const input = snapshot();
    const removed = input.roles[0].permissions.pop();
    const custom = { action_type: 'custom', object_type: 'post' };
    input.roles[0].permissions.push(custom);
    input.roles.push({ id: 'custom', name: 'Custom', permissions: [custom] });
    const missing = input.permissions.pop();
    input.permissions.push(custom);
    input.directUserGrants = 2;
    const report = compare(policy, input);
    assert.equal(report.matches, false);
    assert.deepEqual(report.roles[0].wouldGrant, [removed]);
    assert.deepEqual(report.roles[0].wouldRevoke, [custom]);
    assert.deepEqual(report.roles[1].wouldRevoke, [custom]);
    assert.deepEqual(report.unknownRoles, [{ id: 'custom', name: 'Custom' }]);
    assert.deepEqual(report.catalog.wouldGrant, [missing]);
    assert.deepEqual(report.catalog.wouldRevoke, [custom]);
    assert.equal(report.directUserGrants, 2);
  });

  it('matches an Owner role with no database grants', function () {
    const input = snapshot();
    input.roles.push({ id: 'owner', name: 'Owner', permissions: [] });
    assert.equal(compare(policy, input).matches, true);
  });

  it('reports Owner grant drift because API keys do not use the user bypass', function () {
    const input = snapshot();
    const permission = { action_type: 'edit', object_type: 'tag' };
    input.roles.push({ id: 'owner', name: 'Owner', permissions: [permission] });
    const report = compare(policy, input);
    assert.equal(report.matches, false);
    assert.deepEqual(report.roles, [
      { id: 'owner', name: 'Owner', wouldGrant: [], wouldRevoke: [permission] },
    ]);
  });

  it('logs success and mismatches with the policy version', async function () {
    const info = sinon.stub(logging, 'info');
    const warn = sinon.stub(logging, 'warn');
    await check(policy, async () => snapshot());
    sinon.assert.calledWith(
      info,
      sinon.match({ code: 'PERMISSIONS_PARITY_MATCH', policyVersion: policy.version }),
    );
    const input = snapshot();
    input.directUserGrants = 1;
    await check(policy, async () => input);
    sinon.assert.calledWith(
      warn,
      sinon.match({ code: 'PERMISSIONS_PARITY_MISMATCH', policyVersion: policy.version }),
    );
  });

  it('reports DB and schema failures without preventing boot', async function () {
    const error = sinon.stub(logging, 'error');
    await check(policy, async () => {
      throw new TypeError('database unavailable');
    });
    await check(policy, async () => ({}));
    sinon.assert.calledTwice(error);
    sinon.assert.calledWith(
      error,
      sinon.match({
        code: 'PERMISSIONS_PARITY_CHECK_FAILED',
        errorDetails: JSON.stringify({ policyVersion: policy.version }),
      }),
    );
  });
});
