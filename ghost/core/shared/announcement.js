const { ANNOUNCEMENT_VISIBILITY } = require('./announcement.values');

function getAnnouncementForViewer(settings, member) {
  const announcement = settings.get('announcement_content');
  if (!announcement) {
    return;
  }

  let audience = ANNOUNCEMENT_VISIBILITY.VISITORS;
  if (member) {
    audience =
      member.status === 'free'
        ? ANNOUNCEMENT_VISIBILITY.FREE_MEMBERS
        : ANNOUNCEMENT_VISIBILITY.PAID_MEMBERS;
  }

  if (settings.get('announcement_visibility')?.includes(audience)) {
    return { announcement, announcement_background: settings.get('announcement_background') };
  }
}

module.exports = { getAnnouncementForViewer };
