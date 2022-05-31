const postEmailSerializer = require('./post-email-serializer');
const models = require('../../models');

class EmailPreview {
    /**
     * @param {Object} post - Post model object instance
     * @param {Object} options
     * @param {String} options.newsletter - newsletter slug
     * @param {String} options.memberSegment - member segment filter
     * @returns {Promise<Object>}
     */
    async generateEmailContent(post, {newsletter, memberSegment} = {}) {
        let newsletterModel = await post.getLazyRelation('newsletter');
        if (!newsletterModel) {
            if (newsletter) {
                newsletterModel = await models.Newsletter.findOne({slug: newsletter});
            } else {
                newsletterModel = await models.Newsletter.getDefaultNewsletter();
            }
        }

        let emailContent = await postEmailSerializer.serialize(post, newsletterModel, {
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
