module.exports.formattedMemberResponse = function formattedMemberResponse(member) {
    if (!member) {
        return null;
    }
    return {
        uuid: member.uuid,
        email: member.email,
        name: member.name,
        firstname: member.name && member.name.split(' ')[0],
        avatar_image: member.avatar_image,
        subscribed: !!member.subscribed,
        subscriptions: member.subscriptions || [],
        paid: member.status !== 'free'
    };
};
