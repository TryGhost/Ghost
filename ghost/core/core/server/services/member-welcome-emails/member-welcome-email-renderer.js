const fs = require('fs');
const path = require('path');
const lexicalLib = require('../../lib/lexical');
const {finalize} = require('../email-rendering/finalize');
const errors = require('@tryghost/errors');
const {MESSAGES} = require('./constants');
const {wrapReplacementStrings} = require('../koenig/render-utils/replacement-strings');
const linkReplacer = require('../lib/link-replacer');
const {getEmailDesign} = require('../email-rendering/email-design');

const REPLACEMENT_REGEX = /%%\{(\w+?)(?:,? *"(.*?)")?\}%%/g;
const UNMATCHED_TOKEN_REGEX = /%%\{.*?\}%%/g;

class MemberWelcomeEmailRenderer {
    #wrapperTemplate;

    constructor({t}) {
        this.Handlebars = require('handlebars').create();
        this.Handlebars.registerHelper('t', function (key, options) {
            let hash = options?.hash;
            return t(key, hash || options || {});
        });
        const baseStylesSource = fs.readFileSync(
            path.join(__dirname, '../email-rendering/partials/base-styles.hbs'),
            'utf8'
        );
        const contentStylesSource = fs.readFileSync(
            path.join(__dirname, '../email-rendering/partials/content-styles.hbs'),
            'utf8'
        );
        const cardStylesSource = fs.readFileSync(
            path.join(__dirname, '../email-rendering/partials/card-styles.hbs'),
            'utf8'
        );
        this.Handlebars.registerPartial('baseStyles', baseStylesSource);
        this.Handlebars.registerPartial('contentStyles', contentStylesSource);
        this.Handlebars.registerPartial('cardStyles', cardStylesSource);
        this.Handlebars.registerPartial('styles',
            '<style>\n{{>baseStyles}}\n{{>contentStyles}}\n{{>cardStyles}}\n</style>'
        );
        const emailWrapperSource = fs.readFileSync(
            path.join(__dirname, '../email-rendering/partials/email-wrapper.hbs'),
            'utf8'
        );
        this.Handlebars.registerPartial('emailWrapper', emailWrapperSource);
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
            {id: 'first_name', getValue: () => {
                const name = member.name?.trim();
                if (!name) {
                    return undefined;
                }
                return name.split(/\s+/)[0];
            }},
            {id: 'name', getValue: () => member.name},
            {id: 'email', getValue: () => member.email},
            {id: 'uuid', getValue: () => member.uuid},
            {id: 'site_title', getValue: () => siteSettings.title},
            {id: 'site_url', getValue: () => siteSettings.url}
        ];
    }

    /**
     * Applies replacement tokens to a string
     * Supports fallback values: {first_name, "friend"} renders "friend" if name is empty
     * @param {Object} options
     * @param {{id: string, getValue: () => string|undefined}[]} options.definitions - Replacement token definitions
     * @param {string} options.text - The text to process (content body or subject line)
     * @param {boolean} [options.escapeHtml=false] - Whether to HTML-escape replaced values
     * @returns {string}
     */
    #applyReplacements({definitions, text, escapeHtml = false}) {
        let processed = wrapReplacementStrings(text);

        processed = processed.replace(REPLACEMENT_REGEX, (match, property, fallback) => {
            const def = definitions.find(d => d.id === property);
            if (def) {
                const raw = def.getValue();
                const resolved = raw || fallback || '';
                return escapeHtml ? this.Handlebars.Utils.escapeExpression(resolved) : resolved;
            }
            return match;
        });

        return processed.replace(UNMATCHED_TOKEN_REGEX, '');
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
        const design = getEmailDesign({
            accentColor: siteSettings.accentColor,
            backgroundColor: '#ffffff',
            buttonColor: 'accent',
            buttonCorners: null,
            buttonStyle: null,
            dividerColor: null,
            headerBackgroundColor: null,
            imageCorners: null,
            linkColor: 'accent',
            linkStyle: null,
            postTitleColor: null,
            sectionTitleColor: null,
            titleFontWeight: 'bold'
        });

        let content;
        try {
            content = await lexicalLib.render(lexical, {target: 'email', design});
        } catch (err) {
            throw new errors.IncorrectUsageError({
                message: MESSAGES.INVALID_LEXICAL_STRUCTURE,
                context: err.message
            });
        }

        const definitions = this.#buildReplacementDefinitions({member, siteSettings});

        // Remove <code> wrappers around replacement strings (Lexical treats curly braces as inline code)
        const tokenIds = definitions.map(d => d.id).join('|');
        content = content.replace(
            new RegExp(`<code>(\\{(?:${tokenIds})(?:\\s*,?\\s*"[^"]*")?\\})<\\/code>`, 'g'),
            '$1'
        );

        const contentWithReplacements = this.#applyReplacements({definitions, text: content, escapeHtml: true});
        const subjectWithReplacements = this.#applyReplacements({definitions, text: subject, escapeHtml: false});

        // Resolve relative links (e.g. #/portal/signup) to absolute URLs using the site URL
        const contentWithAbsoluteLinks = await linkReplacer.replace(contentWithReplacements, (url) => {
            return url;
        }, {base: siteSettings.url});

        const managePreferencesUrl = new URL('#/portal/account/newsletters', siteSettings.url).href;
        const year = new Date().getFullYear();

        const html = this.#wrapperTemplate({
            content: contentWithAbsoluteLinks,
            emailTitle: subjectWithReplacements,
            subject: subjectWithReplacements,
            siteTitle: siteSettings.title,
            siteUrl: siteSettings.url,
            managePreferencesUrl,
            year,
            ...design,
            classes: {
                container: 'container'
            }
        });

        const {html: inlinedHtml, plaintext: text} = finalize(html);

        return {
            html: inlinedHtml,
            text,
            subject: subjectWithReplacements
        };
    }
}

module.exports = MemberWelcomeEmailRenderer;
