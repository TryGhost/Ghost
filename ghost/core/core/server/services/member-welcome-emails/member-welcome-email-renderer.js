const fs = require('fs');
const path = require('path');
const logging = require('@tryghost/logging');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');
const juice = require('juice');
const lexicalLib = require('../../lib/lexical');
const errors = require('@tryghost/errors');
const {textColorForBackgroundColor} = require('@tryghost/color-utils');
const {MESSAGES} = require('./constants');
const {wrapReplacementStrings} = require('../koenig/render-utils/replacement-strings');

const REPLACEMENT_REGEX = /%%\{(\w+?)(?:,? *"(.*?)")?\}%%/g;
const UNMATCHED_TOKEN_REGEX = /%%\{.*?\}%%/g;
const VALID_HEX_REGEX = /^#[0-9a-f]{6}$/i;
const CONTENT_IMAGES_PATH_WITHOUT_SIZE_REGEX = /\/content\/images\/(?!size\/)/;

const SERIF_FONT = 'Georgia, Times, "Times New Roman", serif';
const SANS_SERIF_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

const DEFAULT_DESIGN_SETTINGS = {
    background_color: 'light',
    header_background_color: 'transparent',
    header_image: null,
    show_header_title: false,
    footer_content: null,
    title_font_category: 'sans_serif',
    title_font_weight: 'bold',
    body_font_category: 'sans_serif',
    section_title_color: null,
    button_color: 'accent',
    button_style: 'fill',
    button_corners: 'rounded',
    link_color: 'accent',
    link_style: 'underline',
    image_corners: 'square',
    divider_color: null
};

class MemberWelcomeEmailRenderer {
    #wrapperTemplate;
    #imageSize;
    #storageUtils;

    constructor({t, imageSize, storageUtils}) {
        this.#imageSize = imageSize;
        this.#storageUtils = storageUtils;
        this.Handlebars = require('handlebars').create();
        this.Handlebars.registerHelper('t', function (key, options) {
            let hash = options?.hash;
            return t(key, hash || options || {});
        });
        this.Handlebars.registerHelper('or', function () {
            const len = arguments.length - 1;
            for (let i = 0; i < len; i++) {
                if (arguments[i]) {
                    return true;
                }
            }
            return false;
        });
        this.Handlebars.registerHelper('eq', function (a, b) {
            return a === b;
        });
        const cardStylesSource = fs.readFileSync(
            path.join(__dirname, './email-templates/partials/card-styles.hbs'),
            'utf8'
        );
        this.Handlebars.registerPartial('cardStyles', cardStylesSource);
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

    #getBackgroundColor(designSettings) {
        const value = designSettings?.background_color;

        if (VALID_HEX_REGEX.test(value)) {
            return value;
        }

        return '#ffffff';
    }

    #checkIfBackgroundIsDark(designSettings) {
        const backgroundColor = this.#getBackgroundColor(designSettings);
        return textColorForBackgroundColor(backgroundColor).hex().toLowerCase() === '#ffffff';
    }

    #getHeaderBackgroundColor(designSettings, accentColor) {
        const value = designSettings?.header_background_color;

        if (value === 'transparent') {
            return null;
        }

        if (value === 'accent') {
            return accentColor;
        }

        if (VALID_HEX_REGEX.test(value)) {
            return value;
        }

        return null;
    }

    #getButtonColor(designSettings, accentColor) {
        const value = designSettings?.button_color;

        if (value === 'accent') {
            return accentColor;
        }

        if (value === null || value === undefined) {
            const backgroundColor = this.#getBackgroundColor(designSettings);
            return textColorForBackgroundColor(backgroundColor).hex();
        }

        if (VALID_HEX_REGEX.test(value)) {
            return value;
        }

        return accentColor;
    }

    #getButtonBorderRadius(designSettings) {
        const value = designSettings?.button_corners;

        if (value === 'square') {
            return '0';
        }

        if (value === 'pill') {
            return '9999px';
        }

        return '6px';
    }

    #getTitleWeight(designSettings) {
        const weights = {
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700'
        };

        const value = designSettings?.title_font_weight;
        return weights[value] || weights.bold;
    }

    #getSectionTitleColor(designSettings, accentColor) {
        const value = designSettings?.section_title_color;

        if (VALID_HEX_REGEX.test(value)) {
            return value;
        }

        if (value === 'accent') {
            return accentColor;
        }

        return null;
    }

    #getLinkColor(designSettings, accentColor) {
        const value = designSettings?.link_color;

        if (value === 'accent') {
            return accentColor;
        }

        if (value === null || value === undefined) {
            return textColorForBackgroundColor(this.#getBackgroundColor(designSettings)).hex();
        }

        if (VALID_HEX_REGEX.test(value)) {
            return value;
        }

        return accentColor;
    }

    #getDividerColor(designSettings) {
        const value = designSettings?.divider_color;

        if (value === 'accent') {
            return null; // let the template use the default
        }

        if (VALID_HEX_REGEX.test(value)) {
            return value;
        }

        return '#EEF5F8';
    }

    #getBodyFont(designSettings) {
        if (designSettings?.body_font_category === 'serif') {
            return SERIF_FONT;
        }
        return SANS_SERIF_FONT;
    }

    #getTitleFont(designSettings) {
        if (designSettings?.title_font_category === 'serif') {
            return SERIF_FONT;
        }
        return SANS_SERIF_FONT;
    }

    async #limitImageWidth(href, visibleWidth = 600) {
        if (!href) {
            return {href, width: 0};
        }
        try {
            const size = await this.#imageSize.getCachedImageSizeFromUrl(href);
            if (!size || !size.width) {
                return {href, width: 0};
            }
            if (size.width >= visibleWidth) {
                size.width = visibleWidth;
            }
            if (this.#storageUtils.isInternalImage(href)) {
                const sizePath = 'size/w' + (visibleWidth * 2) + '/';
                return {
                    href: href.replace(CONTENT_IMAGES_PATH_WITHOUT_SIZE_REGEX, '/content/images/' + sizePath),
                    width: size.width
                };
            }
            return {href, width: size.width};
        } catch (err) {
            logging.error(err);
        }
        return {href, width: 0};
    }

    /**
     * Renders a member welcome email
     * @param {Object} options
     * @param {string} options.lexical - Lexical JSON string to render
     * @param {string} options.subject - Email subject (may contain template variables)
     * @param {Object} options.member - Member data (name, email)
     * @param {Object} options.siteSettings - Site settings (title, url, accentColor)
     * @param {Object} [options.designSettings] - Design customization settings from email_templates table
     * @returns {Promise<{html: string, text: string, subject: string}>}
     */
    async render({lexical, subject, member, siteSettings, designSettings = DEFAULT_DESIGN_SETTINGS}) {
        designSettings = {...DEFAULT_DESIGN_SETTINGS, ...designSettings};
        const accentColor = siteSettings.accentColor || '#15212A';
        const accentContrastColor = textColorForBackgroundColor(accentColor).hex();

        const backgroundColor = this.#getBackgroundColor(designSettings);
        const backgroundIsDark = this.#checkIfBackgroundIsDark(designSettings);
        const headerBackgroundColor = this.#getHeaderBackgroundColor(designSettings, accentColor);
        const buttonColor = this.#getButtonColor(designSettings, accentColor);
        const buttonTextColor = textColorForBackgroundColor(buttonColor).hex();
        const buttonBorderRadius = this.#getButtonBorderRadius(designSettings);
        const hasOutlineButtons = designSettings?.button_style === 'outline';
        const hasRoundedImageCorners = designSettings?.image_corners === 'rounded';
        const titleWeight = this.#getTitleWeight(designSettings);
        const sectionTitleColor = this.#getSectionTitleColor(designSettings, accentColor);
        const linkColor = this.#getLinkColor(designSettings, accentColor);
        const dividerColor = this.#getDividerColor(designSettings);
        const bodyFont = this.#getBodyFont(designSettings);
        const titleFont = this.#getTitleFont(designSettings);
        const linkStyle = designSettings?.link_style || 'underline';
        const headerBackgroundIsDark = textColorForBackgroundColor(headerBackgroundColor || backgroundColor).hex().toLowerCase() === '#ffffff';
        const textColor = backgroundIsDark ? '#ffffff' : '#15212A';
        const secondaryTextColor = backgroundIsDark ? 'rgba(255,255,255,0.7)' : '#738A94';

        const rawHeaderImage = designSettings?.header_image || null;
        let headerImage = rawHeaderImage;
        let headerImageWidth = 0;
        if (rawHeaderImage && this.#imageSize && this.#storageUtils) {
            const processed = await this.#limitImageWidth(rawHeaderImage);
            headerImage = processed.href;
            headerImageWidth = processed.width;
        }

        let content;
        try {
            content = await lexicalLib.render(lexical, {
                target: 'email',
                design: {
                    backgroundIsDark,
                    hasRoundedImageCorners,
                    sectionTitleColor,
                    titleWeight,
                    hasOutlineButtons,
                    buttonColor,
                    buttonTextColor,
                    buttonBorderRadius,
                    accentColor
                }
            });
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

        const managePreferencesUrl = new URL('#/portal/account/newsletters', siteSettings.url).href;
        const year = new Date().getFullYear();

        const html = this.#wrapperTemplate({
            content: contentWithReplacements,
            subject: subjectWithReplacements,
            siteTitle: siteSettings.title,
            siteUrl: siteSettings.url,
            accentColor,
            accentContrastColor,
            backgroundColor,
            backgroundIsDark,
            headerBackgroundColor,
            headerImage,
            headerImageWidth,
            showHeaderTitle: designSettings?.show_header_title || false,
            footerContent: designSettings?.footer_content || null,
            bodyFont,
            titleFont,
            linkStyle,
            headerBackgroundIsDark,
            textColor,
            secondaryTextColor,
            linkColor,
            dividerColor,
            hasRoundedImageCorners,
            sectionTitleColor,
            titleWeight,
            hasOutlineButtons,
            buttonColor,
            buttonTextColor,
            buttonBorderRadius,
            managePreferencesUrl,
            year
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
