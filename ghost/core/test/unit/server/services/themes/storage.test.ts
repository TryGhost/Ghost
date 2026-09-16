import assert from 'node:assert/strict';
import sinon from 'sinon';

// Loaded with require so the stubs land on the same instances storage.js requires
const storage = require('../../../../../core/server/services/themes/storage');
const ThemeStorage = require('../../../../../core/server/services/themes/theme-storage');
const validate = require('../../../../../core/server/services/themes/validate');
const themeLoader = require('../../../../../core/server/services/themes/loader');
const activator = require('../../../../../core/server/services/themes/activation-bridge');
const list = require('../../../../../core/server/services/themes/list');
const packageJSON = require('../../../../../core/server/lib/package-json');
const bridge = require('../../../../../core/bridge');
const settingsCache = require('../../../../../core/shared/settings-cache');

describe('Themes storage', function () {
  describe('zipToFile', function () {
    it('rejects a theme that is not installed', async function () {
      await assert.rejects(storage.zipToFile('not-installed', '/tmp/not-installed.zip'), {
        name: 'BadRequestError',
      });
    });
  });

  describe('setFromZip', function () {
    const zip = { name: 'my-theme.zip', path: '/tmp/my-theme.zip' };

    let save: sinon.SinonStub;
    let rename: sinon.SinonStub;
    let exists: sinon.SinonStub;
    let remove: sinon.SinonStub;

    beforeEach(function () {
      sinon.stub(validate, 'checkSafe').resolves({ path: '/tmp/does-not-exist-extracted-theme' });
      sinon.stub(validate, 'getErrorsFromCheckedTheme').returns({ errors: [], warnings: [] });
      exists = sinon.stub(ThemeStorage.prototype, 'exists').resolves(true);
      remove = sinon.stub(ThemeStorage.prototype, 'delete').resolves();
      save = sinon.stub(ThemeStorage.prototype, 'save').resolves();
      rename = sinon.stub(ThemeStorage.prototype, 'rename').resolves();
      sinon.stub(themeLoader, 'loadOneTheme').resolves({});
      sinon.stub(activator, 'activateFromAPIOverride').resolves();
      sinon.stub(settingsCache, 'get').withArgs('active_theme').returns('my-theme');
      sinon.stub(list, 'get').returns({});
      sinon.stub(packageJSON, 'filter').returns([{ name: 'my-theme' }]);
      sinon.stub(bridge, 'getActiveTheme').returns(undefined);
    });

    afterEach(function () {
      sinon.restore();
    });

    it('copies the new theme in before moving the live theme aside', async function () {
      await storage.setFromZip(zip);

      const stagingName = save.firstCall.args[0].name;
      assert.match(stagingName, /^my-theme_[0-9a-f]{24}$/);

      assert.equal(rename.callCount, 2);
      const [liveName, backupName] = rename.firstCall.args;
      assert.equal(liveName, 'my-theme');
      assert.notEqual(backupName, stagingName);
      assert.deepEqual(rename.secondCall.args, [stagingName, 'my-theme']);

      sinon.assert.callOrder(save, rename);
    });

    it('leaves the live theme in place when the copy fails', async function () {
      save.rejects(new Error('disk full'));

      await assert.rejects(storage.setFromZip(zip), { message: 'disk full' });

      sinon.assert.notCalled(rename);
    });

    it('restores the backup before deleting it when promoting the staged theme fails', async function () {
      rename.onSecondCall().rejects(new Error('rename failed'));
      exists.onSecondCall().resolves(false);

      await assert.rejects(storage.setFromZip(zip), { message: 'rename failed' });

      const backupName = rename.firstCall.args[1];
      assert.deepEqual(rename.thirdCall.args, [backupName, 'my-theme']);

      const deleteBackup = remove.getCalls().find((call) => call.args[0] === backupName);
      assert.ok(deleteBackup);
      assert.ok(rename.thirdCall.calledBefore(deleteBackup));
    });
  });
});
