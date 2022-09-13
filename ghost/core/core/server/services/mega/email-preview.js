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

        // Do fake replacements, just like a normal email, but use fallbacks and empty values
        const replacements = postEmailSerializer.parseReplacements(emailContent);

        replacements.forEach((replacement) => {
            emailContent[replacement.format] = emailContent[replacement.format].replace(
                replacement.match,
                replacement.fallback || ''
            );
        });

        // Replace unsubscribe URL (%recipient.unsubscribe_url% replacement)
        // We should do this only here because replacements should happen at the very end only, just like when an actual email would be send
        const previewUnsubscribeUrl = postEmailSerializer.createUnsubscribeUrl(null);
        emailContent.html = emailContent.html.replace('%recipient.unsubscribe_url%', previewUnsubscribeUrl);
        emailContent.plaintext = emailContent.plaintext.replace('%recipient.unsubscribe_url%', previewUnsubscribeUrl);

        return {
            subject: emailContent.subject,
            html: emailContent.html,
            plaintext: emailContent.plaintext
        };
    }
}

module.exports = EmailPreview;
