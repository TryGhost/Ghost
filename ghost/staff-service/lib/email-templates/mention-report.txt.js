module.exports = function (data) {
    const {mentions} = data;
    // Create a list of new mentions with a link to the source
    const mentionsList = mentions.map((mention) => {
        return `- ${mention.sourceSiteTitle} (${mention.sourceUrl})`;
    }).join('\n');

    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `
You have been mentioned recently. Here's where:

${mentionsList}

---

Sent to ${data.toEmail} from ${data.siteDomain}.
If you would no longer like to receive these notifications you can adjust your settings at ${data.staffUrl}.
    `;
};
