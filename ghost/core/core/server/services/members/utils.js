function formatNewsletterResponse(newsletters) {
    return newsletters.map(({id, uuid, name, description, sort_order: sortOrder}) => {
        return {
            id,
            uuid,
            name,
            description,
            sort_order: sortOrder
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
        paid: member.status !== 'free',
        created_at: member.created_at,
        enable_comment_notifications: member.enable_comment_notifications
    };
    if (member.newsletters) {
        data.newsletters = formatNewsletterResponse(member.newsletters);
    }

    if (member.email_suppression) {
        data.email_suppression = member.email_suppression;
    }

    return data;
};
