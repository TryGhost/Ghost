module.exports = function giftText(data) {
    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `
Someone purchased a gift subscription!

From: ${data.gift.name}
Tier: ${data.gift.tierName} • ${data.gift.cadenceLabel}
Amount received: ${data.gift.amount}

---

Sent to ${data.toEmail} from ${data.siteDomain}.
If you would no longer like to receive these notifications you can adjust your settings at ${data.staffUrl}.
    `;
};
