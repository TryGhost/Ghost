const settingsCache = require('../../../shared/settings-cache');
const { getAnnouncementForViewer } = require('../../../shared/announcement');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'announcement',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    permissions: true,
    query(frame) {
      return getAnnouncementForViewer(settingsCache, frame.options.context?.member);
    },
  },
};

module.exports = controller;
