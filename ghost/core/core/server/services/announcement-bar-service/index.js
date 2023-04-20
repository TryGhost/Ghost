const settingsCache = require('../../../shared/settings-cache');
const AnnouncementBarSettings = require('@tryghost/announcement-bar-settings');

const announcementBarService = new AnnouncementBarSettings({
    getAnnouncementSettings: () => ({
        announcement: settingsCache.get('announcement_content'),
        announcement_background: settingsCache.get('announcement_background'),
        announcement_visibility: settingsCache.get('announcement_visibility')
    })
});

module.exports = announcementBarService;
