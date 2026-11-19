const { ANNOUNCEMENT_VISIBILITY } = require('../data/schema/default-settings/announcement.values');

/**
 * Returns the announcement for the current viewer, or undefined when it is hidden from them.
 * Paid members are any non-free status, including comped.
 *
 * @param {{get(key: string): any}} settingsCache
 * @param {{status: string}} [member]
 * @returns {{announcement: string, announcement_background: string} | undefined}
 */
function getAnnouncementForViewer(settingsCache, member) {
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

module.exports = { getAnnouncementForViewer };
