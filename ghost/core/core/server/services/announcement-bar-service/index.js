const settingsCache = require('../../../shared/settings-cache');
const AnnouncementBarSettings = require('./announcement-bar-settings');
const { defineService } = require('../../lib/service-lifecycle');

module.exports = defineService({
  name: 'announcement-bar-service',
  create: () =>
    new AnnouncementBarSettings({
      getAnnouncementSettings: () => ({
        announcement: settingsCache.get('announcement_content'),
        announcement_background: settingsCache.get('announcement_background'),
        announcement_visibility: settingsCache.get('announcement_visibility'),
      }),
    }),
});
