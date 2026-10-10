function formatNewsletterResponse(newsletters) {
  return newsletters.map(({ id, uuid, name, description, sort_order: sortOrder }) => {
    return {
      id,
      uuid,
      name,
      description,
      sort_order: sortOrder,
    };
  });
}

module.exports.formatNewsletterResponse = formatNewsletterResponse;

/**
 * A member's metafields as a response shows them, or undefined to leave the key off when
 * the member has none. Most sites define no metafields, so their member responses read
 * exactly as they did before metafields existed.
 *
 * @param {Record<string, Record<string, unknown>> | undefined} metafields
 * @returns {Record<string, Record<string, unknown>> | undefined}
 */
function visibleMetafields(metafields) {
  return metafields && Object.keys(metafields).length > 0 ? metafields : undefined;
}

module.exports.visibleMetafields = visibleMetafields;
module.exports.formattedMemberResponse = function formattedMemberResponse(member) {
  if (!member) {
    return null;
  }
  const data = {
    uuid: member.uuid,
    email: member.email,
    name: member.name,
    firstname: member.name && member.name.split(' ')[0],
    expertise: member.expertise,
    avatar_image: member.avatar_image,
    unsubscribe_url: member.unsubscribe_url,
    subscribed: !!member.subscribed,
    subscriptions: member.subscriptions || [],
    status: member.status,
    paid: member.status !== 'free',
    created_at: member.created_at,
    enable_comment_notifications: member.enable_comment_notifications,
    enable_updates_and_announcements: member.enable_updates_and_announcements,
    can_comment: member.can_comment,
    commenting: member.commenting,
  };
  if (member.newsletters) {
    data.newsletters = formatNewsletterResponse(member.newsletters);
  }

  if (member.email_suppression) {
    data.email_suppression = member.email_suppression;
  }

  const metafields = visibleMetafields(member.metafields);
  if (metafields) {
    data.metafields = metafields;
  }

  return data;
};
