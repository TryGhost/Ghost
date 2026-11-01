const settingsCache = require('../../../shared/settings-cache');

/**
 * Returns the announcement for the current viewer, or undefined when it is hidden from them.
 * Visibility values are 'visitors' (no member), 'free_members' and 'paid_members' (any
 * non-free status). Allowed values are validated by the settings input validator.
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
    (visibilities.includes('visitors') && !member) ||
    (visibilities.includes('free_members') && member?.status === 'free') ||
    (visibilities.includes('paid_members') && member && member.status !== 'free');

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
