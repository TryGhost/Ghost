import assert from 'node:assert/strict';
import sinon from 'sinon';

const root = require('../../../../../core/server/services/announcement-bar-service');
const controller = require('../../../../../core/server/api/endpoints/announcements');
const settingsCache = require('../../../../../core/shared/settings-cache');

describe('Announcement service lifecycle', function () {
  it('keeps the retained controller unavailable outside its boot and reads settings only on use', async function () {
    const service = root.service;
    const frame = { options: {} };
    const firstScope = {};
    const nextScope = {};
    const settings = sinon.stub(settingsCache, 'get');
    settings.withArgs('announcement_visibility').returns(['visitors']);
    settings.withArgs('announcement_background').returns('dark');
    settings.withArgs('announcement_content').returns('First boot');

    try {
      assert.throws(() => controller.browse.query(frame), /announcement-bar-service/);
      await root.init(firstScope);
      sinon.assert.notCalled(settings);
      assert.strictEqual(root.service, service);
      const read = service.getAnnouncementSettings;
      assert.deepEqual(controller.browse.query(frame), {
        announcement: 'First boot',
        announcement_background: 'dark',
      });

      await root.shutdown(firstScope);
      assert.throws(() => controller.browse.query(frame), /announcement-bar-service/);
      assert.throws(() => read(), /announcement-bar-service/);

      settings.withArgs('announcement_content').returns('Next boot');
      settings.resetHistory();
      await root.init(nextScope);
      sinon.assert.notCalled(settings);
      await root.shutdown(firstScope);
      assert.strictEqual(root.service, service);
      assert.deepEqual(controller.browse.query(frame), {
        announcement: 'Next boot',
        announcement_background: 'dark',
      });
      assert.deepEqual(read(), {
        announcement: 'Next boot',
        announcement_background: 'dark',
      });
    } finally {
      try {
        await root.shutdown(firstScope);
        await root.shutdown(nextScope);
      } finally {
        sinon.restore();
      }
    }
  });
});
