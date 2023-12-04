const announcementBarSettings = require('../../services/announcement-bar-service');

module.exports = {
    docName: 'announcement',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query(frame) {
            return announcementBarSettings.getAnnouncementSettings(frame.options.context?.member);
        }
    }
};
