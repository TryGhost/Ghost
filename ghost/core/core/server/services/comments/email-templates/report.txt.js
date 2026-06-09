module.exports = function (data) {
    const visibilityNote = 'This comment will remain visible until you choose to remove it.';

    const actionLinks = `View comment: ${data.postUrl}\nModerate comment: ${data.moderationUrl}`;

    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `Hey there,

${data.reporter} has reported the comment below on ${data.postTitle}. ${visibilityNote}

${data.memberName} (${data.memberEmail}):
${data.commentText}
${actionLinks}

---

Sent to ${data.toEmail} from ${data.siteDomain}.
You can manage your notification preferences at ${data.staffUrl}.`;
};
