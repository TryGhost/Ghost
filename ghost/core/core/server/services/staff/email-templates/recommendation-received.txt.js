module.exports = function (data) {
    const {recommendation} = data;

    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `
You have been recommended by ${recommendation.title || recommendation.url}.

---

Sent to ${data.toEmail} from ${data.siteDomain}.
If you would no longer like to receive these notifications you can adjust your settings at ${data.staffUrl}.
    `;
};
