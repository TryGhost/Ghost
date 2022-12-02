/* eslint-disable no-unused-vars */

const logging = require('@tryghost/logging');
const fs = require('fs').promises;
const path = require('path');
const {isUnsplashImage, isLocalContentImage} = require('@tryghost/kg-default-cards/lib/utils');
const {Color, textColorForBackgroundColor, darkenToContrastThreshold} = require('@tryghost/color-utils');
const {DateTime} = require('luxon');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');

/**
 * @typedef {string|null} Segment
 * @typedef {object} Post
 * @typedef {object} Newsletter
 */

/**
 * @typedef {object} MemberLike
 * @prop {string} id
 * @prop {string} uuid
 * @prop {string} email
 * @prop {string} name
 */

/**
 * @typedef {object} ReplacementDefinition
 * @prop {string} id
 * @prop {RegExp} token
 * @prop {(member: MemberLike) => string} getValue
 */

/**
 * @typedef {object} EmailRenderOptions
 * @prop {boolean} clickTrackingEnabled
 */

/**
 * @typedef {object} EmailBody
 * @prop {string} html
 * @prop {string} plaintext
 * @prop {ReplacementDefinition[]} replacements
 */

class EmailRenderer {
    #settingsCache;
    #settingsHelpers;

    #renderers;

    #imageSize;
    #urlUtils;
    #getPostUrl;

    #handlebars;
    #renderTemplate;
    #linkReplacer;
    #linkTracking;
    #memberAttributionService;
    #audienceFeedbackService;

    /**
     * @param {object} dependencies
     * @param {object} dependencies.settingsCache
     * @param {{getNoReplyAddress(): string, getMembersSupportAddress(): string}} dependencies.settingsHelpers
     * @param {object} dependencies.renderers
     * @param {{render(object, options): string}} dependencies.renderers.lexical
     * @param {{render(object, options): string}} dependencies.renderers.mobiledoc
     * @param {{getImageSizeFromUrl(url: string): Promise<{width: number}>}} dependencies.imageSize
     * @param {{urlFor(type: string, optionsOrAbsolute, absolute): string, isSiteUrl(url, context): boolean}} dependencies.urlUtils
     * @param {(post: Post) => string} dependencies.getPostUrl
     * @param {object} dependencies.linkReplacer
     * @param {object} dependencies.linkTracking
     * @param {object} dependencies.memberAttributionService
     * @param {object} dependencies.audienceFeedbackService
     */
    constructor({
        settingsCache,
        settingsHelpers,
        renderers,
        imageSize,
        urlUtils,
        getPostUrl,
        linkReplacer,
        linkTracking,
        memberAttributionService,
        audienceFeedbackService
    }) {
        this.#settingsCache = settingsCache;
        this.#settingsHelpers = settingsHelpers;
        this.#renderers = renderers;
        this.#imageSize = imageSize;
        this.#urlUtils = urlUtils;
        this.#getPostUrl = getPostUrl;
        this.#linkReplacer = linkReplacer;
        this.#linkTracking = linkTracking;
        this.#memberAttributionService = memberAttributionService;
        this.#audienceFeedbackService = audienceFeedbackService;
    }

    getSubject(post) {
        return post.related('posts_meta')?.get('email_subject') || post.get('title');
    }

    getFromAddress(_post, newsletter) {
        let senderName = this.#settingsCache.get('title') ? this.#settingsCache.get('title').replace(/"/g, '\\"') : '';
        if (newsletter.get('sender_name')) {
            senderName = newsletter.get('sender_name');
        }

        let fromAddress = this.#settingsHelpers.getNoReplyAddress();
        if (newsletter.get('sender_email')) {
            fromAddress = newsletter.get('sender_email');
        }

        // For local development, rewrite the fromAddress to a proper domain
        if (process.env.NODE_ENV !== 'production') {
            if (/@localhost$/.test(fromAddress) || /@ghost.local$/.test(fromAddress)) {
                const localAddress = 'localhost@example.com';
                logging.warn(`Rewriting bulk email from address ${fromAddress} to ${localAddress}`);
                fromAddress = localAddress;
            }
        }

        return senderName ? `"${senderName}" <${fromAddress}>` : fromAddress;
    }

    /**
     * @param {Post} post
     * @param {Newsletter} newsletter
     * @returns {string|null}
     */
    getReplyToAddress(post, newsletter) {
        if (newsletter.get('sender_reply_to') === 'support') {
            return this.#settingsHelpers.getMembersSupportAddress();
        }
        return this.getFromAddress(post, newsletter);
    }

    /**
		Not sure about this, but we need a method that can tell us which member segments are needed for a given post/email.
        @param {Post} post
        @returns {Segment[]}
	*/
    getSegments(post) {
        const allowedSegments = ['status:free', 'status:-free'];
        const html = this.renderPostBaseHtml(post);

        const cheerio = require('cheerio');
        const $ = cheerio.load(html);

        let allSegments = $('[data-gh-segment]')
            .get()
            .map(el => el.attribs['data-gh-segment']);

        /**
         * Always add free and paid segments if email has paywall card
         */
        if (html.indexOf('<!--members-only-->') !== -1) {
            allSegments = allSegments.concat(['status:free', 'status:-free']);
        }

        const segments = [...new Set(allSegments)].filter(segment => allowedSegments.includes(segment));
        if (segments.length === 0) {
            // One segment to all members
            return [null];
        }
        return segments;
    }

    renderPostBaseHtml(post) {
        let html;
        if (post.get('lexical')) {
            html = this.#renderers.lexical.render(
                post.get('lexical'), {target: 'email', postUrl: post.url}
            );
        } else {
            html = this.#renderers.mobiledoc.render(
                JSON.parse(post.get('mobiledoc')), {target: 'email', postUrl: post.url}
            );
        }
        return html;
    }

    /**
     *
     * @param {Post} post
     * @param {Newsletter} newsletter
     * @param {Segment} segment
     * @param {EmailRenderOptions} options
     * @returns {Promise<EmailBody>}
     */
    async renderBody(post, newsletter, segment, options) {
        let html = this.renderPostBaseHtml(post);

        // Paywall and members only content handling
        const isPaidPost = post.get('visibility') === 'paid' || post.get('visibility') === 'tiers';
        const membersOnlyIndex = html.indexOf('<!--members-only-->');
        const hasMembersOnlyContent = membersOnlyIndex !== -1;
        let addPaywall = false;

        if (isPaidPost && hasMembersOnlyContent) {
            if (segment === 'status:free') {
                // Add paywall
                addPaywall = true;

                // Remove the members-only content
                html = html.slice(0, membersOnlyIndex);
            }
        }

        const templateData = await this.getTemplateData({
            post,
            newsletter,
            html,
            addPaywall
        });
        html = await this.renderTemplate(templateData);

        // Link tracking
        if (options.clickTrackingEnabled) {
            html = await this.#linkReplacer.replace(html, async (url) => {
                // We ignore all links that contain %%{uuid}%%
                // because otherwise we would add tracking to links that need to be replaced first
                if (url.toString().indexOf('%%{uuid}%%') !== -1) {
                    return url.toString();
                }

                // Add newsletter source attribution
                const isSite = this.#urlUtils.isSiteUrl(url);

                if (isSite) {
                    // Add newsletter name as ref to the URL
                    url = this.#memberAttributionService.addEmailSourceAttributionTracking(url, newsletter);

                    // Only add post attribution to our own site (because external sites could/should not process this information)
                    url = this.#memberAttributionService.addPostAttributionTracking(url, post);
                } else {
                    // Add email source attribution without the newsletter name
                    url = this.#memberAttributionService.addEmailSourceAttributionTracking(url);
                }

                // Add link click tracking
                url = await this.#linkTracking.service.addTrackingToUrl(url, post, '--uuid--');

                // We need to convert to a string at this point, because we need invalid string characters in the URL
                const str = url.toString().replace(/--uuid--/g, '%%{uuid}%%');
                return str;
            });
        }

        // Juice HTML (inline CSS)
        const juice = require('juice');
        html = juice(html, {inlinePseudoElements: true});

        // happens after inlining of CSS so we can change element types without worrying about styling
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);

        // force all links to open in new tab
        $('a').attr('target', '_blank');

        // convert figure and figcaption to div so that Outlook applies margins
        $('figure, figcaption').each((i, elem) => !!(elem.tagName = 'div'));

        // Remove/hide parts of the email based on segment data attributes
        $('[data-gh-segment]').get().forEach((node) => {
            // TODO: replace with NQL interpretation
            if (node.attribs['data-gh-segment'] !== segment) {
                $(node).remove();
            } else {
                // Getting rid of the attribute for a cleaner html output
                $(node).removeAttr('data-gh-segment');
            }
        });

        // Convert DOM back to HTML
        html = $.html(); // () Fix for vscode syntax highlighter

        // Replacement strings
        const replacementDefinitions = this.buildReplacementDefinitions({html, newsletter});

        // TODO: normalizeReplacementStrings (replace unsupported replacement strings)

        // Convert HTML to plaintext
        const plaintext = htmlToPlaintext.email(html);

        // Fix any unsupported chars in Outlook
        html = html.replace(/&apos;/g, '&#39;');
        html = html.replace(/→/g, '&rarr;');
        html = html.replace(/–/g, '&ndash;');
        html = html.replace(/“/g, '&ldquo;');
        html = html.replace(/”/g, '&rdquo;');

        return {
            html,
            plaintext,
            replacements: replacementDefinitions
        };
    }

    /**
     * @private
     * createUnsubscribeUrl
     *
     * Takes a member and newsletter uuid. Returns the url that should be used to unsubscribe
     * In case of no member uuid, generates the preview unsubscribe url - `?preview=1`
     *
     * @param {string} uuid post uuid
     * @param {Object} [options]
     * @param {string} [options.newsletterUuid] newsletter uuid
     * @param {boolean} [options.comments] Unsubscribe from comment emails
     */
    createUnsubscribeUrl(uuid, options = {}) {
        const siteUrl = this.#urlUtils.urlFor('home', true);
        const unsubscribeUrl = new URL(siteUrl);
        unsubscribeUrl.pathname = `${unsubscribeUrl.pathname}/unsubscribe/`.replace('//', '/');
        if (uuid) {
            unsubscribeUrl.searchParams.set('uuid', uuid);
        } else {
            unsubscribeUrl.searchParams.set('preview', '1');
        }
        if (options.newsletterUuid) {
            unsubscribeUrl.searchParams.set('newsletter', options.newsletterUuid);
        }
        if (options.comments) {
            unsubscribeUrl.searchParams.set('comments', '1');
        }

        return unsubscribeUrl.href;
    }

    /**
     * @private
     * Note that we only look in HTML because plaintext and HTML are essentially the same content
     * @returns {ReplacementDefinition[]}
     */
    buildReplacementDefinitions({html, newsletter}) {
        const baseDefinitions = [
            {
                id: 'unsubscribe_url',
                getValue: (member) => {
                    return this.createUnsubscribeUrl(member.uuid, {newsletterUuid: newsletter.get('uuid')});
                }
            },
            {
                id: 'uuid',
                getValue: (member) => {
                    return member.uuid;
                }
            },
            {
                id: 'first_name',
                getValue: (member) => {
                    return member.name?.split(' ')[0];
                }
            }
        ];

        // Now loop through all the definenitions to see which ones are actually used + to add fallbacks if needed
        const EMAIL_REPLACEMENT_REGEX = /%%\{(.*?)\}%%/g;
        const REPLACEMENT_STRING_REGEX = /^(?<recipientProperty>\w+?)(?:,? *(?:"|&quot;)(?<fallback>.*?)(?:"|&quot;))?$/;

        function escapeRegExp(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        // Stores the definitions that we are actually going to use
        const replacements = [];

        let result;
        while ((result = EMAIL_REPLACEMENT_REGEX.exec(html)) !== null) {
            const [replacementMatch, replacementStr] = result;

            // Did we already found this match and added it to the replacements array?
            if (replacements.find(r => r.id === replacementStr)) {
                continue;
            }
            const match = replacementStr.match(REPLACEMENT_STRING_REGEX);

            if (match) {
                const {recipientProperty, fallback} = match.groups;
                const definition = baseDefinitions.find(d => d.id === recipientProperty);

                if (definition) {
                    replacements.push({
                        id: replacementStr,
                        originalId: recipientProperty,
                        token: new RegExp(escapeRegExp(replacementMatch), 'g'),
                        getValue: fallback ? (member => definition.getValue(member) || fallback) : definition.getValue
                    });
                }
            }
        }

        // Now loop any replacements with possible invalid characters and replace them with a clean id
        let counter = 1;
        for (const replacement of replacements) {
            if (replacement.id.match(/[^a-zA-Z0-9_]/)) {
                counter += 1;
                replacement.id = replacement.originalId + '_' + counter;
            }
            delete replacement.originalId;
        }

        return replacements;
    }

    async renderTemplate(data) {
        if (this.#renderTemplate) {
            return this.#renderTemplate(data);
        }
        this.#handlebars = require('handlebars');

        // Helpers
        this.#handlebars.registerHelper('if', function (conditional, options) {
            if (conditional) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        this.#handlebars.registerHelper('and', function () {
            const len = arguments.length - 1;

            for (let i = 0; i < len; i++) {
                if (!arguments[i]) {
                    return false;
                }
            }

            return true;
        });

        this.#handlebars.registerHelper('not', function () {
            const len = arguments.length - 1;

            for (let i = 0; i < len; i++) {
                if (!arguments[i]) {
                    return true;
                }
            }

            return false;
        });

        this.#handlebars.registerHelper('or', function () {
            const len = arguments.length - 1;

            for (let i = 0; i < len; i++) {
                if (arguments[i]) {
                    return true;
                }
            }

            return false;
        });

        // Partials
        const cssPartialSource = await fs.readFile(path.join(__dirname, './email-templates/partials/', `styles.hbs`), 'utf8');
        this.#handlebars.registerPartial('styles', cssPartialSource);

        const paywallPartial = await fs.readFile(path.join(__dirname, './email-templates/partials/', `paywall.hbs`), 'utf8');
        this.#handlebars.registerPartial('paywall', paywallPartial);

        const feedbackButtonPartial = await fs.readFile(path.join(__dirname, './email-templates/partials/', `feedback-button.hbs`), 'utf8');
        this.#handlebars.registerPartial('feedbackButton', feedbackButtonPartial);

        // Actual template
        const htmlTemplateSource = await fs.readFile(path.join(__dirname, './email-templates/', `template.hbs`), 'utf8');
        this.#renderTemplate = this.#handlebars.compile(Buffer.from(htmlTemplateSource).toString());
        return this.#renderTemplate(data);
    }

    /**
     * @private
     */
    async getTemplateData({post, newsletter, html, addPaywall}) {
        const accentColor = this.#settingsCache.get('accent_color') || '#15212A';
        const adjustedAccentColor = accentColor && darkenToContrastThreshold(accentColor, '#ffffff', 2).hex();
        const adjustedAccentContrastColor = accentColor && textColorForBackgroundColor(adjustedAccentColor).hex();

        const color = new Color(accentColor);
        const buttonBackgroundColor = `${accentColor}10`;
        const buttonTextColor = color.darken(0.6).hex();

        const {href: headerImage, width: headerImageWidth} = await this.limitImageWidth(newsletter.get('header_image'));
        const {href: postFeatureImage, width: postFeatureImageWidth} = await this.limitImageWidth(post.get('feature_image'));

        const timezone = this.#settingsCache.get('timezone');
        const publishedAt = (post.get('published_at') ? DateTime.fromJSDate(post.get('published_at')) : DateTime.local()).setZone(timezone).toLocaleString({
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        let authors;
        const postAuthors = await post.getLazyRelation('authors');
        if (postAuthors.models) {
            if (postAuthors.models.length <= 2) {
                authors = postAuthors.models.map(author => author.get('name')).join(' & ');
            } else {
                authors = `${postAuthors.models[0].name} & ${postAuthors.models.length - 1} others`;
            }
        }

        const postUrl = this.#getPostUrl(post);

        // Signup URL is the post url with a hash added to it
        const signupUrl = new URL(postUrl);
        signupUrl.hash = `/portal/signup`;

        // Audience feedback
        const positiveLink = this.#audienceFeedbackService.buildLink(
            '--uuid--',
            post.id,
            1
        ).href.replace('--uuid--', '%%{uuid}%%');
        const negativeLink = this.#audienceFeedbackService.buildLink(
            '--uuid--',
            post.id,
            0
        ).href.replace('--uuid--', '%%{uuid}%%');

        const data = {
            site: {
                title: this.#settingsCache.get('title'),
                url: this.#urlUtils.urlFor('home', true),
                iconUrl: this.#settingsCache.get('icon') ?
                    this.#urlUtils.urlFor('image', {
                        image: this.#settingsCache.get('icon')
                    }, true) : null
            },
            preheader: post.get('excerpt') ? post.get('excerpt') : `${post.get('title')} – `,
            html,

            post: {
                title: post.get('title'),
                url: postUrl,
                authors,
                publishedAt,
                feature_image: postFeatureImage,
                feature_image_width: postFeatureImageWidth,
                feature_image_alt: post.related('posts_meta')?.get('feature_image_alt'),
                feature_image_caption: post.related('posts_meta')?.get('feature_image_caption')
            },

            newsletter: {
                name: newsletter.get('name')
            },

            //CSS
            accentColor: accentColor, // default to #15212A
            adjustedAccentColor: adjustedAccentColor || '#3498db', // default to #3498db
            adjustedAccentContrastColor: adjustedAccentContrastColor || '#ffffff', // default to #ffffff
            showBadge: newsletter.get('show_badge'),

            headerImage,
            headerImageWidth,
            showHeaderIcon: newsletter.get('show_header_icon') && this.#settingsCache.get('icon'),
            showHeaderTitle: newsletter.get('show_header_title'),
            showHeaderName: newsletter.get('show_header_name'),
            showFeatureImage: newsletter.get('show_feature_image') && postFeatureImage,
            footerContent: newsletter.get('footer_content'),

            classes: {
                title: 'post-title' + (newsletter.get('title_font_category') === 'serif' ? ` post-title-serif` : ``) + (newsletter.get('title_alignment') === 'left' ? ` post-title-left` : ``),
                titleLink: 'post-title-link' + (newsletter.get('title_alignment') === 'left' ? ` post-title-link-left` : ``),
                meta: 'post-meta' + (newsletter.get('title_alignment') === 'left' ? ` post-meta-left` : ``),
                body: newsletter.get('body_font_category') === 'sans_serif' ? `post-content-sans-serif` : `post-content`
            },

            // Audience feedback
            feedbackButtons: newsletter.get('feedback_enabled') ? {
                likeHref: positiveLink,
                dislikeHref: negativeLink,
                backgroundColor: buttonBackgroundColor,
                textColor: buttonTextColor,

                sizes: {
                    width: 100,
                    height: 38,
                    iconWidth: 24
                },
                // Sizes defined in pixels won’t be adjusted when Outlook is rendering at 120 dpi.
                // To solve the problem we use values in points (1 pixel = 0.75 point).
                // resource: https://www.hteumeuleu.com/2021/background-properties-in-vml/
                sizesOutlook: {
                    width: (100 + 24) * 0.75,
                    height: 38 * 0.75 + 1,
                    iconWidth: 24 * 0.75
                }
            } : null,

            // Paywall
            paywall: addPaywall ? {
                signupUrl: signupUrl.href
            } : null,

            year: new Date().getFullYear().toString()
        };

        return data;
    }

    /**
     * @private
     * Sets and limits the width of an image + returns the width
     * @returns {Promise<{href: string, width: number}>}
     */
    async limitImageWidth(href) {
        if (!href) {
            return {
                href,
                width: 0
            };
        }
        if (isUnsplashImage(href)) {
            // Unsplash images have a minimum size so assuming 1200px is safe
            const unsplashUrl = new URL(href);
            unsplashUrl.searchParams.set('w', '1200');

            return {
                href: unsplashUrl.href,
                width: 600
            };
        } else {
            try {
                const size = await this.#imageSize.getImageSizeFromUrl(href);

                if (size.width >= 600) {
                    // keep original image, just set a fixed width
                    size.width = 600;
                }

                // WARNING:
                // TODO: this whole `isLocalContentImage` can never ever work (always false), this is old code that needs a rewrite!
                if (isLocalContentImage(href, this.#urlUtils.urlFor('home', true))) {
                    // we can safely request a 1200px image - Ghost will serve the original if it's smaller
                    return {
                        href: href.replace(/\/content\/images\//, '/content/images/size/w1200/'),
                        width: size.width
                    };
                }

                return {
                    href,
                    width: size.width
                };
            } catch (err) {
                // log and proceed. Using original header image without fixed width isn't fatal.
                logging.error(err);
            }
        }

        return {
            href,
            width: 0
        };
    }
}

module.exports = EmailRenderer;
