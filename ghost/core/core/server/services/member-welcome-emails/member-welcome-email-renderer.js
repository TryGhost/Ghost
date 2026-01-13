const fs = require('fs');
const path = require('path');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');
const juice = require('juice');
const lexicalLib = require('../../lib/lexical');
const errors = require('@tryghost/errors');
const {MESSAGES} = require('./constants');

class MemberWelcomeEmailRenderer {
    #wrapperTemplate;

    constructor() {
        this.Handlebars = require('handlebars').create();
        const wrapperSource = fs.readFileSync(
            path.join(__dirname, './email-templates/wrapper.hbs'),
            'utf8'
        );
        this.#wrapperTemplate = this.Handlebars.compile(wrapperSource);
    }

    /**
     * Renders a member welcome email
     * @param {Object} options
     * @param {string} options.lexical - Lexical JSON string to render
     * @param {string} options.subject - Email subject (may contain template variables)
     * @param {Object} options.member - Member data (name, email)
     * @param {Object} options.siteSettings - Site settings (title, url, accentColor)
     * @returns {Promise<{html: string, text: string, subject: string}>}
     */
    async render({lexical, subject, member, siteSettings}) {
        let content;
        try {
            content = await lexicalLib.render(lexical, {target: 'email'});
        } catch (err) {
            throw new errors.IncorrectUsageError({
                message: MESSAGES.INVALID_LEXICAL_STRUCTURE,
                context: err.message
            });
        }

        const memberName = member.name || 'there';
        const firstName = memberName.split(' ')[0];

        const templateData = {
            site: {
                title: siteSettings.title,
                url: siteSettings.url
            },
            member: {
                name: memberName,
                email: member.email || '',
                firstname: firstName
            },
            siteTitle: siteSettings.title,
            siteUrl: siteSettings.url,
            accentColor: siteSettings.accentColor
        };

        const contentWithReplacements = this.Handlebars.compile(content)(templateData);
        const subjectWithReplacements = this.Handlebars.compile(subject)(templateData);

        const html = this.#wrapperTemplate({
            ...templateData,
            content: contentWithReplacements,
            subject: subjectWithReplacements
        });

        const inlinedHtml = juice(html, {inlinePseudoElements: true, removeStyleTags: true});
        const text = htmlToPlaintext.email(inlinedHtml);

        return {
            html: inlinedHtml,
            text,
            subject: subjectWithReplacements
        };
    }
}

module.exports = MemberWelcomeEmailRenderer;

