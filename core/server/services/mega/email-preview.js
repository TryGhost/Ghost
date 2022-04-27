const postEmailSerializer = require('./post-email-serializer');
const models = require('../../models');

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
        const newsletter = await models.Newsletter.getDefaultNewsletter();

        let emailContent = await postEmailSerializer.serialize(post, newsletter, {
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
