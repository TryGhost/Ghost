module.exports = function (data, t) {
    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `${t('Hey there,')}

${t('Someone just replied to your comment on {postTitle}.', {postTitle: data.postTitle, interpolation: {escapeValue: false}})}

${data.postUrl}

---

${t('This message was sent from {siteDomain} to {email}.', {email: data.toEmail, siteDomain: data.siteDomain, interpolation: {escapeValue: false}})}
${t('You can unsubscribe from these notifications at {profileUrl}.', {profileUrl: data.profileUrl, interpolation: {escapeValue: false}})}`;
};
