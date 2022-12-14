module.exports = function (data) {
    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `Hey there,

Someone just replied to your comment on "${data.postTitle}"

${data.postUrl}#ghost-comments

---

Sent to ${data.toEmail} from ${data.siteDomain}.
You can unsubscribe from these notifications at ${data.profileUrl}.`;
};
