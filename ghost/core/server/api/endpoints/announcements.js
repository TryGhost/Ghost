const settingsCache = require('../../../shared/settings-cache');
const {
  ANNOUNCEMENT_VISIBILITY,
} = require('../../data/schema/default-settings/announcement.values');

/**
 * Returns the announcement for the current viewer, or undefined when it is hidden from them.
 * Paid members are any non-free status, including comped.
 *
 * @param {{status: string}} [member]
 * @returns {{announcement: string, announcement_background: string} | undefined}
 */
function getAnnouncementForViewer(member) {
  const announcement = settingsCache.get('announcement_content');
  const background = settingsCache.get('announcement_background');
  const visibilities = settingsCache.get('announcement_visibility');

  if (!announcement) {
    return;
  }

  const visible =
    (visibilities.includes(ANNOUNCEMENT_VISIBILITY.VISITORS) && !member) ||
    (visibilities.includes(ANNOUNCEMENT_VISIBILITY.FREE_MEMBERS) && member?.status === 'free') ||
    (visibilities.includes(ANNOUNCEMENT_VISIBILITY.PAID_MEMBERS) &&
      member &&
      member.status !== 'free');

  if (visible) {
    return {
      announcement,
      announcement_background: background,
    };
  }
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'announcement',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    permissions: true,
    query(frame) {
      return getAnnouncementForViewer(frame.options.context?.member);
    },
  },
};

module.exports = controller;
