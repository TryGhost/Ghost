const assert = require('node:assert/strict');
const sinon = require('sinon');
const _ = require('lodash');
const actionsMap = require('../../../../../core/server/services/permissions/actions-map-cache');
const rolePermissions = require('../../../../../core/server/services/permissions/role-permissions');
const {
  permissions: permissionData,
} = require('../../../../../core/server/services/permissions/permissions-data');
const permissions = require('../../../../../core/server/services/permissions');

describe('Permissions', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('No init (no action map)', function () {
    it('throws an error without actionMap', function () {
      sinon.stub(actionsMap, 'empty').returns(true);

      assert.throws(permissions.canThis, /No actions map found/);
    });
  });

  describe('Init (build actions map)', function () {
    it('builds the actions map from the permissions defined in code', async function () {
      const actions = await permissions.init();

      assert.doesNotThrow(permissions.canThis);

      const expected = {};
      for (const perm of rolePermissions.all()) {
        expected[perm.action_type] = expected[perm.action_type] || [];
        expected[perm.action_type].push(perm.object_type);
      }

      assert.deepEqual(actions, expected);
      assert.deepEqual(actionsMap.getAll(), expected);
    });

    it('exposes every object type for each of its actions', async function () {
      const actions = await permissions.init();

      for (const [objectType, objectActions] of Object.entries(permissionData)) {
        for (const action of objectActions) {
          assert(actions[action].includes(objectType), `${action}:${objectType}`);
        }
      }

      for (const objectTypes of Object.values(actions)) {
        assert.equal(_.uniq(objectTypes).length, objectTypes.length);
      }
    });

    it('builds a canThis chain for permissions defined in code', async function () {
      await permissions.init();

      const canThisResult = permissions.canThis({ internal: true });

      assert.equal(typeof canThisResult.edit.post, 'function');
      assert.equal(typeof canThisResult.browse.member, 'function');
      assert.equal(typeof canThisResult.exportContent.db, 'function');
    });
  });
});
