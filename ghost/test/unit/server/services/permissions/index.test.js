const assert = require('node:assert/strict');
const {
  permissions: permissionData,
} = require('../../../../../core/server/services/permissions/permissions-data');
const permissions = require('../../../../../core/server/services/permissions');

describe('Permissions', function () {
  it('builds a canThis chain for every permission defined in code', function () {
    const canThisResult = permissions.canThis({ internal: true });

    for (const [objectType, objectActions] of Object.entries(permissionData)) {
      for (const action of objectActions) {
        assert.equal(
          typeof canThisResult[action][objectType],
          'function',
          `${action}:${objectType}`,
        );
      }
    }
  });
});
