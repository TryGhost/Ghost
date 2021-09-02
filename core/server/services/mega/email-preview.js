const postEmailSerializer = require('./post-email-serializer');

class EmailPreview {
    /**
     * @constructor
     * @param {Object} options
     * @param {String} options.apiVersion
     */
    constructor({apiVersion}) {
        this.apiVersion = apiVersion;
    }

    /**
     * @param {Object} post - Post model object instance
     * @param {String} memberSegment - member segment filter
     * @returns {Promise<Object>}
     */
    async generateEmailContent(post, memberSegment) {
        let emailContent = await postEmailSerializer.serialize(post, {
            isBrowserPreview: true,
            apiVersion: this.apiVersion
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
