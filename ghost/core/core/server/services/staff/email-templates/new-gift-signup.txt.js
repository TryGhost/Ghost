module.exports = function (data) {
    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `
You have a new gift member: "${data.memberData.name}"

Tier: ${data.giftData.tierName}
Duration: ${data.giftData.duration}
View member: ${data.memberData.adminUrl}

---

Sent to ${data.toEmail} from ${data.siteDomain}.
If you would no longer like to receive these notifications you can adjust your settings at ${data.staffUrl}.
    `;
};
