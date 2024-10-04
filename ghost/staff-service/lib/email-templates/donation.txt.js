module.exports = function (data) {
    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `
Cha-ching!

You received a one-time payment from of ${data.donation.amount} from "${data.donation.name}".

Message: ${data.donation.donationMessage ? data.donation.donationMessage : 'No message provided'}

---

Sent to ${data.toEmail} from ${data.siteDomain}.
If you would no longer like to receive these notifications you can adjust your settings at ${data.staffUrl}.
    `;
};
