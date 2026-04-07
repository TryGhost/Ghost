module.exports = function giftText(data) {
    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `
Someone purchased a gift subscription!

You received a gift subscription purchase of ${data.gift.amount} from "${data.gift.name}".

---

Sent to ${data.toEmail} from ${data.siteDomain}.
If you would no longer like to receive these notifications you can adjust your settings at ${data.staffUrl}.
    `;
};
