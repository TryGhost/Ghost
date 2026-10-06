const assert = require('node:assert/strict');
const { assertExists } = require('../../../../utils/assertions');
const sinon = require('sinon');
const testUtils = require('../../../../utils');
const models = require('../../../../../core/server/models');
const actionsMap = require('../../../../../core/server/services/permissions/actions-map-cache');
const permissions = require('../../../../../core/server/services/permissions');
const rolePermissions = require('../../../../../core/server/services/permissions/role-permissions');
const parity = require('../../../../../core/server/services/permissions/parity-check');

describe('Permissions', function () {
  let fakePermissions = [];

  beforeEach(function () {
    sinon.stub(rolePermissions.RolePermissions.prototype, 'all').callsFake(function () {
      return fakePermissions;
    });
    sinon.stub(parity.parityCheck, 'check').resolves();

    sinon.stub(models.Post, 'findOne').callsFake(function () {
      return Promise.resolve(models.Post.forge(testUtils.DataGenerator.Content.posts[0]));
    });

    sinon.stub(models.Tag, 'findOne').callsFake(function () {
      return Promise.resolve({});
    });
  });

  afterEach(function () {
    sinon.restore();
    rolePermissions.init();
    actionsMap.init(rolePermissions.all());
  });

  /**
   * Default test actionMap looks like this:
   * {
   *   browse: [ 'post' ],
   *   edit: [ 'post', 'tag', 'user', 'page' ],
   *   add: [ 'post', 'user', 'page' ],
   *   destroy: [ 'post', 'user' ]
   * }
   *
   * @param {object} options
   * @return {Array|*}
   */
  function loadFakePermissions(options) {
    options = options || {};

    const fixturePermissions = structuredClone(testUtils.DataGenerator.Content.permissions);

    const extraPerm = {
      name: 'test',
      action_type: 'edit',
      object_type: 'post',
    };

    if (options.extra) {
      fixturePermissions.push(extraPerm);
    }

    return fixturePermissions.map(function (testPerm) {
      return testUtils.DataGenerator.forKnex.createPermission(testPerm);
    });
  }

  describe('No init (no action map)', function () {
    it('throws an error without actionMap', function () {
      sinon.stub(actionsMap, 'empty').returns(true);

      assert.throws(permissions.canThis, /No actions map found/);
    });
  });

  describe('Init (build actions map)', function () {
    it('publishes an immutable action map and returns independent snapshots', async function () {
      fakePermissions = loadFakePermissions();
      const actions = await permissions.init();
      assert(Object.isFrozen(actions));
      assert(Object.isFrozen(actions.browse));
      const copy = actionsMap.getAll();
      copy.browse.push('tag');
      delete copy.edit;
      assert.deepEqual(actionsMap.getAll().browse, ['post']);
      assert.deepEqual(actionsMap.getAll().edit, ['post', 'tag', 'user', 'page']);
    });

    it('awaits the boot audit before completing initialization', async function () {
      fakePermissions = loadFakePermissions();
      let releaseAudit;
      const audit = new Promise((resolve) => {
        releaseAudit = resolve;
      });
      parity.parityCheck.check.returns(audit);
      let initialized = false;
      const initialization = permissions.init().then(() => {
        initialized = true;
      });
      await Promise.resolve();
      sinon.assert.calledOnce(parity.parityCheck.check);
      assert.equal(initialized, false);
      releaseAudit();
      await initialization;
      assert.equal(initialized, true);
    });

    it('replaces the catalog on repeated initialization without DB catalog reads', async function () {
      const findPermissions = sinon.stub(models.Permission, 'findAll');
      fakePermissions = loadFakePermissions();
      await permissions.init();
      fakePermissions = [{ action_type: 'read', object_type: 'tag' }];
      assert.deepEqual(await permissions.init(), { read: ['tag'] });
      sinon.assert.notCalled(findPermissions);
    });

    it('can load an actions map from existing permissions', async function () {
      fakePermissions = loadFakePermissions();

      const actions = await permissions.init();

      assertExists(actions);

      assert.doesNotThrow(permissions.canThis);

      assert.deepEqual(Object.keys(actions), ['browse', 'edit', 'add', 'destroy']);

      assert.deepEqual(actions.browse, ['post']);
      assert.deepEqual(actions.edit, ['post', 'tag', 'user', 'page']);
      assert.deepEqual(actions.add, ['post', 'user', 'page']);
      assert.deepEqual(actions.destroy, ['post', 'user']);
    });

    it('can load an actions map from existing permissions, and deduplicate', async function () {
      fakePermissions = loadFakePermissions({ extra: true });

      const actions = await permissions.init();

      assertExists(actions);

      assert.doesNotThrow(permissions.canThis);

      assert.deepEqual(Object.keys(actions), ['browse', 'edit', 'add', 'destroy']);

      assert.deepEqual(actions.browse, ['post']);
      assert.deepEqual(actions.edit, ['post', 'tag', 'user', 'page']);
      assert.deepEqual(actions.add, ['post', 'user', 'page']);
      assert.deepEqual(actions.destroy, ['post', 'user']);
    });
  });
});
