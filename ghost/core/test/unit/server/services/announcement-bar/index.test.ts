import assert from 'node:assert/strict';
import sinon from 'sinon';

const root = require('../../../../../core/server/services/announcement-bar-service');
const controller = require('../../../../../core/server/api/endpoints/announcements');
const settingsCache = require('../../../../../core/shared/settings-cache');

describe('Announcement service initialization', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('keeps its shared service and retained methods across repeated initialization without reading settings', async function () {
    const service = root.service;
    const settings = sinon.stub(settingsCache, 'get');
    settings.withArgs('announcement_visibility').returns(['visitors']);
    settings.withArgs('announcement_background').returns('dark');
    settings.withArgs('announcement_content').returns('First announcement');

    await root.init();
    sinon.assert.notCalled(settings);
    const read = service.getAnnouncementSettings;
    assert.deepEqual(controller.browse.query({ options: {} }), {
      announcement: 'First announcement',
      announcement_background: 'dark',
    });

    settings.withArgs('announcement_content').returns('Updated announcement');
    settings.resetHistory();
    await root.init();
    sinon.assert.notCalled(settings);
    assert.strictEqual(root.service, service);
    assert.strictEqual(service.getAnnouncementSettings, read);
    assert.equal('shutdown' in root, false);
    assert.deepEqual(controller.browse.query({ options: {} }), {
      announcement: 'Updated announcement',
      announcement_background: 'dark',
    });
    assert.deepEqual(read(), {
      announcement: 'Updated announcement',
      announcement_background: 'dark',
    });
  });
});
