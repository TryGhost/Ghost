module.exports = function (data) {
    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `Hey there,

${data.reporter} has reported the comment below on ${data.postTitle}. This comment will remain visible until you choose to remove it, which can be done directly on the post.

${data.memberName} (${data.memberEmail}):
${data.commentText}

${data.postUrl}#ghost-comments

---

Sent to ${data.toEmail} from ${data.siteDomain}.
You can manage your notification preferences at ${data.staffUrl}.`;
};
