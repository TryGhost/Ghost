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

  // Absent rather than empty on a site that has defined no extra fields, which is
  // most of them, so those members' accounts read exactly as they did before this
  // existed. Present but empty means the publisher has defined fields and this
  // member has answered none, which a client renders as blank inputs rather than
  // as nothing to fill in.
  if (member.metafields) {
    data.metafields = member.metafields;
  }

  return data;
};
