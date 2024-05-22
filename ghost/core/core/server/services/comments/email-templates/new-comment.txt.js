module.exports = function (data) {
    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `
Hey there,

Someone just posted a comment on your post "${data.postTitle}"

${data.postUrl}#ghost-comments

---

Sent to ${data.toEmail} from ${data.siteDomain}.
You can manage your notification preferences at ${data.staffUrl}.
    `;
};
