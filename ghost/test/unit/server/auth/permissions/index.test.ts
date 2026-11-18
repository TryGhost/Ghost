import assert from 'node:assert/strict';
import { permissions as permissionData } from '../../../../../core/server/auth/permissions/permissions-data';
import permissions from '../../../../../core/server/auth/permissions';

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
