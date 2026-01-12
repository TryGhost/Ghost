const fs = require('fs');
const path = require('path');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');
const juice = require('juice');
const lexicalLib = require('../../lib/lexical');
const errors = require('@tryghost/errors');
const {MESSAGES} = require('./constants');
const {wrapReplacementStrings} = require('../koenig/render-utils/replacement-strings');

const REPLACEMENT_REGEX = /%%\{(\w+?)(?:,? *"(.*?)")?\}%%/g;

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
     * Builds replacement token definitions for member and site data
     * @param {Object} options
     * @param {Object} options.member - Member data
     * @param {string} [options.member.name] - Member's full name
     * @param {string} [options.member.email] - Member's email address
     * @param {Object} options.siteSettings - Site settings
     * @param {string} options.siteSettings.title - Site title
     * @param {string} options.siteSettings.url - Site URL
     * @returns {{id: string, getValue: () => string|undefined}[]}
     */
    #buildReplacementDefinitions({member, siteSettings}) {
        return [
            {id: 'first_name', getValue: () => member.name?.split(' ')[0]},
            {id: 'name', getValue: () => member.name},
            {id: 'email', getValue: () => member.email},
            {id: 'site_title', getValue: () => siteSettings.title},
            {id: 'site_url', getValue: () => siteSettings.url}
        ];
    }

    /**
     * Applies replacement tokens to a string
     * Supports fallback values: {first_name, "friend"} renders "friend" if name is empty
     * @param {Object} options
     * @param {string} options.text - The text to process (content body or subject line)
     * @param {Object} options.member - Member data
     * @param {Object} options.siteSettings - Site settings
     * @returns {string}
     */
    #applyReplacements({text, member, siteSettings}) {
        const definitions = this.#buildReplacementDefinitions({member, siteSettings});
        let processed = wrapReplacementStrings(text);

        return processed.replace(REPLACEMENT_REGEX, (match, property, fallback) => {
            const def = definitions.find(d => d.id === property);
            if (def) {
                return def.getValue() || fallback || '';
            }
            return match;
        });
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

        const contentWithReplacements = this.#applyReplacements({text: content, member, siteSettings});
        const subjectWithReplacements = this.#applyReplacements({text: subject, member, siteSettings});

        const html = this.#wrapperTemplate({
            content: contentWithReplacements,
            subject: subjectWithReplacements,
            siteTitle: siteSettings.title,
            siteUrl: siteSettings.url,
            accentColor: siteSettings.accentColor
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

