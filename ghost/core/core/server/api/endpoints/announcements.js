const announcementBarSettings = require('../../services/announcement-bar-service');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
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

module.exports = controller;
