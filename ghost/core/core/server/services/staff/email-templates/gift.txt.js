module.exports = function giftText(data) {
    // Be careful when you indent the email, because whitespaces are visible in emails!
    const tierLine = data.gift.tierName
        ? `\nTier: ${data.gift.tierName}${data.gift.cadenceLabel ? ` • ${data.gift.cadenceLabel}` : ''}`
        : '';

    return `
Someone purchased a gift subscription!

From: ${data.gift.name}${tierLine}
Amount received: ${data.gift.amount}

---

Sent to ${data.toEmail} from ${data.siteDomain}.
If you would no longer like to receive these notifications you can adjust your settings at ${data.staffUrl}.
    `;
};
