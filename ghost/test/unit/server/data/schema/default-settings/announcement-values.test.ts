import assert from 'node:assert/strict';
import defaultSettings from '../../../../../../core/server/data/schema/default-settings/default-settings.json';
import { ANNOUNCEMENT_BACKGROUND_VALUES } from '../../../../../../core/server/data/schema/default-settings/announcement.values';

describe('Announcement setting values', function () {
  it('match the announcement_background isIn list in default settings', function () {
    assert.deepEqual(defaultSettings.announcement.announcement_background.isIn, [
      [...ANNOUNCEMENT_BACKGROUND_VALUES],
    ]);
  });
});
