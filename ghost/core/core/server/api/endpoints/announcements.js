const announcementBarSettings = require('../../services/announcement-bar-service');

module.exports = {
    docName: 'announcement',

    browse: {
        permissions: true,
        query(frame) {
            return announcementBarSettings.getAnnouncementSettings(frame.options.context?.member);
        }
    }
};
