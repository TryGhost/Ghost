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
        this.Handlebars.registerHelper('or', (...args) => args.slice(0, -1).some(Boolean));
        this.Handlebars.registerHelper('and', (...args) => args.slice(0, -1).every(Boolean));
        this.Handlebars.registerHelper('not', value => !value);
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
            '<style>\n{{>baseStyles}}\n{{>contentStyles}}\n{{>cardStyles}}\n.header {\n    line-height: 1.4;\n    {{#if headerBackgroundColor}}\n    background-color: {{headerBackgroundColor}};\n    {{else}}\n    background-color: {{backgroundColor}};\n    {{/if}}\n}\n.header-image {\n    padding-top: 24px;\n    padding-bottom: 16px;\n}\n.site-info {\n    padding-top: 32px;\n}\n.site-url {\n    color: {{#if headerBackgroundIsDark}}#ffffff{{else}}#15212A{{/if}};\n    font-size: 16px;\n    letter-spacing: -0.1px;\n    font-weight: 700;\n    text-transform: uppercase;\n    text-align: center;\n}\n.site-url-bottom-padding {\n    padding-bottom: 12px;\n}\n.site-title {\n    color: {{#if headerBackgroundIsDark}}#ffffff{{else}}#15212A{{/if}};\n}\n.footer-powered {\n    text-align: center;\n    padding-top: 32px;\n    padding-bottom: 20px;\n}\n.gh-powered {\n    width: 142px;\n    height: 30px;\n}\n</style>'
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
     * @param {Object} [options.designSettings] - Email design settings from the database
     * @param {Object} options.siteSettings - Site settings (title, url, accentColor)
     * @returns {Promise<{html: string, text: string, subject: string}>}
     */
    async render({lexical, subject, member, designSettings = {}, siteSettings}) {
        const design = getEmailDesign({
            accentColor: siteSettings.accentColor,
            backgroundColor: designSettings.background_color,
            buttonColor: designSettings.button_color,
            buttonCorners: designSettings.button_corners,
            buttonStyle: designSettings.button_style,
            dividerColor: designSettings.divider_color,
            headerBackgroundColor: designSettings.header_background_color,
            imageCorners: designSettings.image_corners,
            linkColor: designSettings.link_color,
            linkStyle: designSettings.link_style,
            postTitleColor: null,
            sectionTitleColor: designSettings.section_title_color,
            titleFontWeight: designSettings.title_font_weight
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
            footerContent: designSettings.footer_content,
            hasHeaderContent: Boolean(designSettings.header_image || designSettings.show_header_title),
            headerImage: designSettings.header_image,
            showBadge: designSettings.show_badge,
            showHeaderTitle: designSettings.show_header_title,
            site: {
                title: siteSettings.title,
                url: siteSettings.url
            },
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
