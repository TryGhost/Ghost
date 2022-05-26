function formatNewsletterResponse(newsletters) {
    return newsletters.map(({id, name, description, sort_order: sortOrder}) => {
        return {id, name, description, sort_order: sortOrder};
    });
}

module.exports.formattedMemberResponse = function formattedMemberResponse(member) {
    if (!member) {
        return null;
    }
    const data = {
        uuid: member.uuid,
        email: member.email,
        name: member.name,
        firstname: member.name && member.name.split(' ')[0],
        avatar_image: member.avatar_image,
        subscribed: !!member.subscribed,
        subscriptions: member.subscriptions || [],
        paid: member.status !== 'free'
    };
    if (member.newsletters) {
        data.newsletters = formatNewsletterResponse(member.newsletters);
    }
    return data;
};
