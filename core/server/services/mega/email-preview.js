const postEmailSerializer = require('./post-email-serializer');

class EmailPreview {
    /**
     * @param {Object} post - Post model object instance
     * @param {String} memberSegment - member segment filter
     * @returns {Promise<Object>}
     */
    async generateEmailContent(post, memberSegment) {
        let emailContent = await postEmailSerializer.serialize(post, {
            isBrowserPreview: true
        });

        if (memberSegment) {
            emailContent = postEmailSerializer.renderEmailForSegment(emailContent, memberSegment);
        }

        const replacements = postEmailSerializer.parseReplacements(emailContent);

        replacements.forEach((replacement) => {
            emailContent[replacement.format] = emailContent[replacement.format].replace(
                replacement.match,
                replacement.fallback || ''
            );
        });

        return emailContent;
    }
}

module.exports = EmailPreview;
