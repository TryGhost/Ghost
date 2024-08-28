module.exports = function (data) {
    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `
Hey there,

A paid member's subscription has just been canceled: "${data.memberData.name}"

---

Sent to ${data.toEmail} from ${data.siteDomain}.
If you would no longer like to receive these notifications you can adjust your settings at ${data.staffUrl}.
    `;
};
