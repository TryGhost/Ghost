/* eslint-disable no-unused-vars */
/* eslint-disable no-shadow */

const logging = require('@tryghost/logging');
const fs = require('fs').promises;
const path = require('path');
const clsx = require('clsx');
const {isUnsplashImage} = require('@tryghost/kg-default-cards/lib/utils');
const {textColorForBackgroundColor, darkenToContrastThreshold} = require('@tryghost/color-utils');
const {DateTime} = require('luxon');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');
const EmailAddressParser = require('../email-address/email-address-parser');
const {registerHelpers} = require('./helpers/register-helpers');
const crypto = require('crypto');

const DEFAULT_LOCALE = 'en-gb';
const DEFAULT_ACCENT_COLOR = '#15212A';
const VALID_HEX_REGEX = /#([0-9a-f]{3}){1,2}$/i;

// Wrapper function so that i18next-parser can find these strings
const t = (x) => {
    return x;
};

const messages = {
    subscriptionStatus: {
        free: '',
        expired: t('Your subscription has expired.'),
        canceled: t('Your subscription has been canceled and will expire on {date}. You can resume your subscription via your account settings.'),
        active: t('Your subscription will renew on {date}.'),
        trial: t('Your free trial ends on {date}, at which time you will be charged the regular price. You can always cancel before then.'),
        complimentaryExpires: t('Your subscription will expire on {date}.'),
        complimentaryInfinite: ''
    }
};

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function isValidLocale(locale) {
    try {
        // Attempt to create a DateTimeFormat with the locale
        new Intl.DateTimeFormat(locale);
        return true; // No error means it's a valid locale
    } catch (e) {
        return false; // RangeError means invalid locale
    }
}

function formatDateLong(date, timezone, locale = DEFAULT_LOCALE) {
    return DateTime.fromJSDate(date).setZone(timezone).setLocale(locale).toLocaleString({
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// This aids with lazyloading the cheerio dependency
function cheerioLoad(html) {
    const cheerio = require('cheerio');
    return cheerio.load(html);
}

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
 * @prop {'free'|'paid'|'comped'} status
 * @prop {Date|null} createdAt This can be null if the member has been deleted for older email recipient rows
 * @prop {MemberLikeSubscription[]} subscriptions Required to get trial end / next renewal date / expire at date for paid member
 * @prop {MemberLikeTier[]} tiers Required to get the expiry date in case of a comped member
 *
 * @typedef {object} MemberLikeSubscription
 * @prop {string} status
 * @prop {boolean} cancel_at_period_end
 * @prop {Date|null} trial_end_at
 * @prop {Date} current_period_end
 *
 * @typedef {object} MemberLikeTier
 * @prop {string} product_id
 * @prop {Date|null} expiry_at
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
    #storageUtils;

    #handlebars;
    #renderTemplate;
    #linkReplacer;
    #linkTracking;
    #memberAttributionService;
    #outboundLinkTagger;
    #audienceFeedbackService;
    #emailAddressService;
    #labs;
    #models;
    #t;

    /**
     * @param {object} dependencies
     * @param {object} dependencies.settingsCache
     * @param {{getNoReplyAddress(): string, getMembersSupportAddress(): string, getMembersValidationKey(): string, createUnsubscribeUrl(uuid: string, options: object): string}} dependencies.settingsHelpers
     * @param {object} dependencies.renderers
     * @param {{render(object, options): string}} dependencies.renderers.lexical
     * @param {{render(object, options): string}} dependencies.renderers.mobiledoc
     * @param {{getImageSizeFromUrl(url: string): Promise<{width: number, height: number}>}} dependencies.imageSize
     * @param {{urlFor(type: string, optionsOrAbsolute, absolute): string, isSiteUrl(url, context): boolean}} dependencies.urlUtils
     * @param {{isLocalImage(url: string): boolean}} dependencies.storageUtils
     * @param {(post: Post) => string} dependencies.getPostUrl
     * @param {object} dependencies.linkReplacer
     * @param {object} dependencies.linkTracking
     * @param {object} dependencies.memberAttributionService
     * @param {object} dependencies.audienceFeedbackService
     * @param {object} dependencies.emailAddressService
     * @param {object} dependencies.outboundLinkTagger
     * @param {object} dependencies.labs
     * @param {{Post: object}} dependencies.models
     * @param {Function} dependencies.t
     */
    constructor({
        settingsCache,
        settingsHelpers,
        renderers,
        imageSize,
        urlUtils,
        storageUtils,
        getPostUrl,
        linkReplacer,
        linkTracking,
        memberAttributionService,
        audienceFeedbackService,
        emailAddressService,
        outboundLinkTagger,
        labs,
        models,
        t
    }) {
        this.#settingsCache = settingsCache;
        this.#settingsHelpers = settingsHelpers;
        this.#renderers = renderers;
        this.#imageSize = imageSize;
        this.#urlUtils = urlUtils;
        this.#storageUtils = storageUtils;
        this.#getPostUrl = getPostUrl;
        this.#linkReplacer = linkReplacer;
        this.#linkTracking = linkTracking;
        this.#memberAttributionService = memberAttributionService;
        this.#audienceFeedbackService = audienceFeedbackService;
        this.#emailAddressService = emailAddressService;
        this.#outboundLinkTagger = outboundLinkTagger;
        this.#labs = labs;
        this.#models = models;
        this.#t = t;
    }

    getSubject(post, isTestEmail = false) {
        const subject = post.related('posts_meta')?.get('email_subject') || post.get('title');
        return isTestEmail ? `[TEST] ${subject}` : subject;
    }

    #getRawFromAddress(post, newsletter) {
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
        return {
            address: fromAddress,
            name: senderName || undefined
        };
    }

    // Locale is user-input, so we need to ensure it's valid
    #getValidLocale() {
        let locale = this.#settingsCache.get('locale') || DEFAULT_LOCALE;

        // Remove any trailing whitespace
        locale = locale.trim();

        // If the locale is just "en", or is not valid, revert to default
        if (locale === 'en' || !isValidLocale(locale)) {
            locale = DEFAULT_LOCALE;
        }

        return locale;
    }

    /**
     * @param {Post} post
     * @param {Newsletter} newsletter
     * @param {boolean} [useFallbackAddress]
     * @returns {string|null}
     */
    getFromAddress(post, newsletter, useFallbackAddress = false) {
        // Clean from address to ensure DMARC alignment
        const addresses = this.#emailAddressService.getAddress({
            from: this.#getRawFromAddress(post, newsletter)
        }, {useFallbackAddress});

        return EmailAddressParser.stringify(addresses.from);
    }

    /**
     * @param {Post} post
     * @param {Newsletter} newsletter
     * @param {boolean} [useFallbackAddress]
     * @returns {string|null}
     */
    getReplyToAddress(post, newsletter, useFallbackAddress = false) {
        const replyToAddress = newsletter.get('sender_reply_to');

        if (replyToAddress === 'support') {
            return this.#settingsHelpers.getMembersSupportAddress();
        }

        if (replyToAddress === 'newsletter' && !this.#emailAddressService.managedEmailEnabled) {
            return this.getFromAddress(post, newsletter, useFallbackAddress);
        }

        const addresses = this.#emailAddressService.getAddress({
            from: this.#getRawFromAddress(post, newsletter),
            replyTo: replyToAddress === 'newsletter' ? undefined : {address: replyToAddress}
        }, {useFallbackAddress});

        if (addresses.replyTo) {
            return EmailAddressParser.stringify(addresses.replyTo);
        }
        return null;
    }

    /**
		Returns all the segments that we need to render the email for because they have different content.
        WARNING: The sum of all the returned segments should always include all the members. Those members are later limited if needed based on the recipient filter of the email.
        @param {Post} post
        @returns {Promise<Segment[]>}
	*/
    async getSegments(post) {
        const allowedSegments = ['status:free', 'status:-free'];
        const html = await this.renderPostBaseHtml(post);

        /**
         * Always add free and paid segments if email has paywall card
         */
        if (html.indexOf('<!--members-only-->') !== -1) {
            // We have different content between free and paid members
            return allowedSegments;
        }

        const $ = cheerioLoad(html);

        let allSegments = $('[data-gh-segment]')
            .get()
            .map(el => el.attribs['data-gh-segment']);

        const segments = [...new Set(allSegments)].filter(segment => allowedSegments.includes(segment));
        if (segments.length === 0) {
            // No difference in email content between free and paid
            return [null];
        }

        // We have different content between free and paid members
        return allowedSegments;
    }

    async renderPostBaseHtml(post, newsletter) {
        const postUrl = this.#getPostUrl(post);

        const renderOptions = {
            target: 'email',
            postUrl
        };

        const accentColor = this.#getAccentColor();
        const accentContrastColor = this.#getAccentContrastColor();

        renderOptions.design = {
            accentColor,
            accentContrastColor,
            backgroundColor: newsletter?.get('background_color'),
            backgroundIsDark: this.#checkIfBackgroundIsDark(newsletter),
            headerBackgroundColor: this.#getHeaderBackgroundColor(newsletter, accentColor),
            buttonCorners: newsletter?.get('button_corners'),
            buttonStyle: newsletter?.get('button_style'),
            titleFontWeight: newsletter?.get('title_font_weight'),
            linkStyle: newsletter?.get('link_style'),
            imageCorners: newsletter?.get('image_corners'),
            postTitleColor: this.#getPostTitleColor(newsletter, accentColor),
            sectionTitleColor: newsletter?.get('section_title_color'),
            linkColor: newsletter?.get('link_color'),
            // TODO:
            // if the other options above have default or calculated values we
            // should follow the same pattern as the options below to avoid
            //duplicating magic values or logic in renderers
            dividerColor: this.#getDividerColor(newsletter),
            buttonColor: this.#getButtonColor(newsletter, accentColor),
            buttonTextColor: this.#getButtonTextColor(newsletter, accentColor)
        };

        let html;
        if (post.get('lexical')) {
            // only lexical's renderer is async
            html = await this.#renderers.lexical.render(
                post.get('lexical'),
                renderOptions
            );
        } else {
            html = this.#renderers.mobiledoc.render(
                JSON.parse(post.get('mobiledoc')), {target: 'email', postUrl}
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
        let html = await this.renderPostBaseHtml(post, newsletter);

        // We don't allow the usage of the %%{uuid}%% replacement in the email body (only in links and special cases)
        // So we need to filter them before we introduce the real %%{uuid}%%
        html = html.replace(/%%{uuid}%%/g, '{uuid}');

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

        let $ = cheerioLoad(html);

        // Remove parts of the HTML not applicable to the current segment - We do this
        // before rendering the template as the preheader for the email may be generated
        // using the HTML and we don't want to include content that should not be
        // visible depending on the segment
        $('[data-gh-segment]').get().forEach((node) => {
            // TODO: replace with NQL interpretation
            if (node.attribs['data-gh-segment'] !== segment) {
                $(node).remove();
            } else {
                // Getting rid of the attribute for a cleaner html output
                $(node).removeAttr('data-gh-segment');
            }
        });

        html = $.html();

        const templateData = await this.getTemplateData({
            post,
            newsletter,
            html,
            addPaywall,
            segment
        });
        html = await this.renderTemplate(templateData);

        // We pass the base option to the link replacer so relative links are replaced with absolute links, relative to this base url
        const base = templateData.post.url;

        // Link tracking
        if (options.clickTrackingEnabled) {
            html = await this.#linkReplacer.replace(html, async (url, originalPath) => {
                if (originalPath.startsWith('%%{') && originalPath.endsWith('}%%')) {
                    // Don't add the base url to replacement strings
                    return originalPath;
                }

                // Ignore empty hashtags (used as a hack for email addresses to prevent making them clickable)
                if (originalPath === '#') {
                    return originalPath;
                }

                // We ignore all links that contain %%{uuid}%%
                // because otherwise we would add tracking to links that need to be replaced first
                if (url.toString().indexOf('%%{uuid}%%') !== -1) {
                    return url.toString();
                }

                // Add newsletter source attribution
                const isSite = this.#urlUtils.isSiteUrl(url);

                if (isSite) {
                    // Add newsletter name as ref to the URL
                    url = this.#outboundLinkTagger.addToUrl(url, newsletter);

                    // Only add post attribution to our own site (because external sites could/should not process this information)
                    url = this.#memberAttributionService.addPostAttributionTracking(url, post);
                } else {
                    // Add email source attribution without the newsletter name
                    url = this.#outboundLinkTagger.addToUrl(url);
                }

                // Don't add tracking to the Powered by Ghost badge
                if (url.hostname === 'ghost.org' && url.pathname === '/' && url.searchParams.get('via') === 'pbg-newsletter') {
                    return url.toString();
                }

                // Add link click tracking
                url = await this.#linkTracking.service.addTrackingToUrl(url, post, '--uuid--');

                // We need to convert to a string at this point, because we need invalid string characters in the URL
                const str = url.toString().replace(/--uuid--/g, '%%{uuid}%%');
                return str;
            }, {base});
        } else {
            // Replace all relative links to absolute ones
            html = await this.#linkReplacer.replace(html, (url, originalPath) => {
                if (originalPath.startsWith('%%{') && originalPath.endsWith('}%%')) {
                    // Don't add the base url to replacement strings
                    return originalPath;
                }

                // Ignore empty hashtags (used as a hack for email addresses to prevent making them clickable)
                if (originalPath === '#') {
                    return originalPath;
                }
                return url;
            }, {base});
        }

        // Record the original image width and height attributes before inlining the styles with juice
        // If any images have `width: auto` or `height: auto` set via CSS,
        // juice will explicitly set the width/height attributes to `auto` on the <img /> tag
        // This is not supported by Outlook, so we need to reset the width/height attributes to the original values
        // Other clients will ignore the width/height attributes and use the inlined CSS instead
        $ = cheerioLoad(html);
        const originalImageSizes = $('img').get().map((image) => {
            const src = image.attribs.src;
            const width = image.attribs.width;
            const height = image.attribs.height;
            return {src, width, height};
        });

        // Add a class to each figcaption so we can style them in the email
        $('figcaption').each((i, elem) => !!($(elem).addClass('kg-card-figcaption')));
        html = $.html();

        // Juice HTML (inline CSS)
        const juice = require('juice');
        html = juice(html, {inlinePseudoElements: true, removeStyleTags: true});

        // happens after inlining of CSS so we can change element types without worrying about styling
        $ = cheerioLoad(html);

        // Reset any `height="auto"` or `width="auto"` attributes to their original values before inlining CSS
        const imageTags = $('img').get();
        for (let i = 0; i < imageTags.length; i += 1) {
            // There shouldn't be any issues with consistency between these two lists, but just in case...
            if (imageTags[i].attribs.src === originalImageSizes[i].src) {
                // if the image width or height is set to 'auto', reset to its original value
                if (imageTags[i].attribs.width === 'auto' && originalImageSizes[i].width) {
                    imageTags[i].attribs.width = originalImageSizes[i].width;
                }
                if (imageTags[i].attribs.height === 'auto' && originalImageSizes[i].height) {
                    imageTags[i].attribs.height = originalImageSizes[i].height;
                }
            }
        }

        // force all links to open in new tab
        $('a').attr('target', '_blank');

        // convert figure and figcaption to div so that Outlook applies margins
        $('figure, figcaption').each((i, elem) => !!(elem.tagName = 'div'));

        // Remove duplicate black/white images (CSS based solution not working in Outlook)
        if (templateData.backgroundIsDark) {
            $('img.is-light-background').each((i, elem) => {
                $(elem).remove();
            });
        } else {
            $('img.is-dark-background').each((i, elem) => {
                $(elem).remove();
            });
        }

        // Convert DOM back to HTML
        html = $.html(); // () Fix for vscode syntax highlighter

        // Replacement strings
        const replacementDefinitions = this.buildReplacementDefinitions({html, newsletterUuid: newsletter.get('uuid')});

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
     * createUnsubscribeUrl
     *
     * Takes a member and newsletter uuid. Returns the url that should be used to unsubscribe
     * In case of no member uuid, generates the preview unsubscribe url - `?preview=1`
     *
     * @param {string} [uuid] member uuid
     * @param {Object} [options]
     * @param {string} [options.newsletterUuid] newsletter uuid
     * @param {boolean} [options.comments] Unsubscribe from comment emails
     */
    createUnsubscribeUrl(uuid, options = {}) {
        return this.#settingsHelpers.createUnsubscribeUrl(uuid, options);
    }

    /**
     * createManageAccountUrl
     *
     * @param {string} [uuid] member uuid
     */
    createManageAccountUrl(uuid) {
        const siteUrl = this.#urlUtils.urlFor('home', true);
        const url = new URL(siteUrl);
        url.hash = '#/portal/account';

        return url.href;
    }

    /**
     * Returns whether a paid member is trialing a subscription
     */
    isMemberTrialing(member) {
        // Do we have an active subscription?
        if (member.status === 'paid') {
            let activeSubscription = member.subscriptions.find((subscription) => {
                return subscription.status === 'trialing';
            });

            if (!activeSubscription) {
                return false;
            }

            // Translate to a human readable string
            if (activeSubscription.trial_end_at && activeSubscription.trial_end_at > new Date() && activeSubscription.status === 'trialing') {
                return true;
            }
        }

        return false;
    }

    /**
     * @param {MemberLike} member
     * @returns {string}
     */
    getMemberStatusText(member) {
        const t = this.#t;
        const locale = this.#getValidLocale();

        if (member.status === 'free') {
            // Not really used, but as a backup
            return t(messages.subscriptionStatus.free);
        }

        // Do we have an active subscription?
        if (member.status === 'paid') {
            let activeSubscription = member.subscriptions.find((subscription) => {
                return subscription.status === 'active';
            }) ?? member.subscriptions.find((subscription) => {
                return ['active', 'trialing', 'unpaid', 'past_due'].includes(subscription.status);
            });

            if (!activeSubscription && !member.tiers.length) {
                // No subscription?
                return t(messages.subscriptionStatus.expired);
            }

            if (!activeSubscription) {
                if (!member.tiers[0]?.expiry_at) {
                    return t(messages.subscriptionStatus.complimentaryInfinite);
                }
                // Create one manually that is expiring
                activeSubscription = {
                    cancel_at_period_end: true,
                    current_period_end: member.tiers[0].expiry_at,
                    status: 'active',
                    trial_end_at: null
                };
            }
            const timezone = this.#settingsCache.get('timezone');
            // Translate to a human readable string
            if (activeSubscription.trial_end_at && activeSubscription.trial_end_at > new Date() && activeSubscription.status === 'trialing') {
                const date = formatDateLong(activeSubscription.trial_end_at, timezone, locale);
                return t(messages.subscriptionStatus.trial, {date});
            }

            const date = formatDateLong(activeSubscription.current_period_end, timezone, locale);
            if (activeSubscription.cancel_at_period_end) {
                return t(messages.subscriptionStatus.canceled, {date});
            }
            return t(messages.subscriptionStatus.active, {date});
        }

        const expires = member.tiers[0]?.expiry_at ?? null;

        if (expires) {
            const timezone = this.#settingsCache.get('timezone');
            const date = formatDateLong(expires, timezone, locale);
            return t(messages.subscriptionStatus.complimentaryExpires, {date});
        }

        return t(messages.subscriptionStatus.complimentaryInfinite);
    }

    /**
     * Note that we only look in HTML because plaintext and HTML are essentially the same content
     * @returns {ReplacementDefinition[]}
     */
    buildReplacementDefinitions({html, newsletterUuid}) {
        const t = this.#t; // es-lint-disable-line no-shadow
        const locale = this.#getValidLocale();

        const baseDefinitions = [
            {
                id: 'unsubscribe_url',
                getValue: (member) => {
                    return this.createUnsubscribeUrl(member.uuid, {newsletterUuid});
                }
            },
            {
                id: 'manage_account_url',
                getValue: (member) => {
                    return this.createManageAccountUrl(member.uuid);
                }
            },
            {
                id: 'uuid',
                getValue: (member) => {
                    return member.uuid;
                }
            },
            {
                id: 'key',
                getValue: (member) => {
                    return crypto.createHmac('sha256', this.#settingsHelpers.getMembersValidationKey()).update(member.uuid).digest('hex');
                }
            },
            {
                id: 'first_name',
                getValue: (member) => {
                    return member.name?.split(' ')[0];
                }
            },
            {
                id: 'name',
                getValue: (member) => {
                    return member.name;
                }
            },
            {
                id: 'name_class',
                getValue: (member) => {
                    return member.name ? '' : 'hidden';
                }
            },
            {
                id: 'email',
                getValue: (member) => {
                    return member.email;
                }
            },
            {
                id: 'created_at',
                getValue: (member) => {
                    const timezone = this.#settingsCache.get('timezone');
                    return member.createdAt ? formatDateLong(member.createdAt, timezone, locale) : '';
                }
            },
            {
                id: 'status',
                getValue: (member) => {
                    if (member.status === 'comped') {
                        return t('complimentary');
                    }
                    if (this.isMemberTrialing(member)) {
                        return t('trialing');
                    }
                    // other possible statuses: t('free'), t('paid') //
                    return t(member.status);
                }
            },
            {
                //TODO i18n
                id: 'status_text',
                getValue: (member) => {
                    return this.getMemberStatusText(member);
                }
            },
            // List unsubscribe header to unsubcribe in one-click
            {
                id: 'list_unsubscribe',
                getValue: (member) => {
                    return this.createUnsubscribeUrl(member.uuid, {newsletterUuid});
                },
                required: true // Used in email headers
            },
            // Unique ID used for ad images to bypass ESP image proxies
            {
                id: 'uniqueid',
                getValue: () => {
                    return crypto.randomUUID();
                }
            }
        ];

        // Now loop through all the definenitions to see which ones are actually used + to add fallbacks if needed
        const EMAIL_REPLACEMENT_REGEX = /%%\{(.*?)\}%%/g;
        const REPLACEMENT_STRING_REGEX = /^(?<recipientProperty>\w+?)(?:,? *(?:"|&quot;)(?<fallback>.*?)(?:"|&quot;))?$/;

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
                        token: new RegExp(escapeRegExp(replacementMatch).replace(/(?:"|&quot;)/g, '(?:"|&quot;)'), 'g'),
                        getValue: fallback ? (member => definition.getValue(member) || fallback) : definition.getValue
                    });
                }
            }
        }

        // Add all required replacements
        for (const definition of baseDefinitions) {
            if (definition.required && !replacements.find(r => r.id === definition.id)) {
                replacements.push({
                    id: definition.id,
                    originalId: definition.id,
                    token: new RegExp(`%%\\{${definition.id}\\}%%`, 'g'),
                    getValue: definition.getValue
                });
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

    getLabs() {
        return this.#labs;
    }

    async renderTemplate(data) {
        const labs = this.getLabs();
        this.#handlebars = require('handlebars').create();

        // Register helpers
        registerHelpers(this.#handlebars, labs, this.#t);

        // Partials
        const cssPartialSource = await fs.readFile(path.join(__dirname, './email-templates/partials/', `styles.hbs`), 'utf8');
        this.#handlebars.registerPartial('styles', cssPartialSource);

        const paywallPartial = await fs.readFile(path.join(__dirname, './email-templates/partials/', `paywall.hbs`), 'utf8');
        this.#handlebars.registerPartial('paywall', paywallPartial);

        const feedbackButtonPartial = await fs.readFile(path.join(__dirname, './email-templates/partials/', `feedback-button.hbs`), 'utf8');
        this.#handlebars.registerPartial('feedbackButton', feedbackButtonPartial);

        const latestPostsPartial = await fs.readFile(path.join(__dirname, './email-templates/partials/', `latest-posts.hbs`), 'utf8');
        this.#handlebars.registerPartial('latestPosts', latestPostsPartial);

        // Actual template
        let templateName = 'template.hbs';
        const htmlTemplateSource = await fs.readFile(path.join(__dirname, './email-templates/', templateName), 'utf8');
        this.#renderTemplate = this.#handlebars.compile(Buffer.from(htmlTemplateSource).toString());

        return this.#renderTemplate(data);
    }

    /**
     * Get email preheader text from post model
     * @param {object} postModel
     * @returns
     */
    #getEmailPreheader(postModel, segment, html) {
        let plaintext = postModel.get('plaintext');
        let customExcerpt = postModel.get('custom_excerpt');
        if (customExcerpt) {
            return customExcerpt;
        } else {
            if (plaintext) {
                // The plaintext field on the model may contain paid only content
                // so we use the provided HTML to generate the plaintext as this
                // should have already had the paid content removed
                if (segment === 'status:free') {
                    plaintext = htmlToPlaintext.email(html);
                }
                return plaintext.substring(0, 500);
            } else {
                return `${postModel.get('title')} – `;
            }
        }
    }

    truncateText(text, maxLength) {
        if (text && text.length > maxLength) {
            return text.substring(0, maxLength - 1).trim() + '…';
        } else {
            return text ?? '';
        }
    }

    /**
     *
     * @param {*} text
     * @param {number} maxLength
     * @param {number} maxLengthMobile should be smaller than maxLength
     * @returns
     */
    truncateHtml(text, maxLength, maxLengthMobile) {
        if (!maxLengthMobile || maxLength <= maxLengthMobile) {
            return escapeHtml(this.truncateText(text, maxLength));
        }
        if (text && text.length > maxLengthMobile) {
            let ellipsis = '';

            if (text.length > maxLengthMobile && text.length <= maxLength) {
                ellipsis = '<span class="hide-desktop">…</span>';
            } else if (text.length > maxLength) {
                ellipsis = '…';
            }

            return escapeHtml(text.substring(0, maxLengthMobile - 1)) + '<span class="desktop-only">' + escapeHtml(text.substring(maxLengthMobile - 1, maxLength - 1)) + '</span>' + ellipsis;
        } else {
            return escapeHtml(text ?? '');
        }
    }

    #getAccentColor() {
        let accentColor = this.#settingsCache?.get('accent_color') || DEFAULT_ACCENT_COLOR;

        if (!VALID_HEX_REGEX.test(accentColor)) {
            accentColor = DEFAULT_ACCENT_COLOR;
        }

        return accentColor;
    }

    #getAccentContrastColor() {
        const accentColor = this.#getAccentColor();
        return textColorForBackgroundColor(accentColor).hex();
    }

    #getBackgroundColor(newsletter) {
        /** @type {'light' | string | null} */
        const value = newsletter?.get('background_color');

        if (VALID_HEX_REGEX.test(value)) {
            return value;
        }

        // value === null, value is not valid hex
        return '#ffffff';
    }

    #getPostTitleColor(newsletter, accentColor) {
        /** @type {'accent' | string | null} */
        const value = newsletter?.get('post_title_color');

        if (VALID_HEX_REGEX.test(value)) {
            return value;
        }

        if (value === 'accent') {
            return accentColor;
        }

        // value === null, value is not valid hex
        const backgroundColor = this.#getHeaderBackgroundColor(newsletter, accentColor) || this.#getBackgroundColor(newsletter);
        return textColorForBackgroundColor(backgroundColor).hex();
    }

    #getSectionTitleColor(newsletter, accentColor) {
        /** @type {'accent' | string | null} */
        const value = newsletter.get('section_title_color');

        if (VALID_HEX_REGEX.test(value)) {
            return value;
        }

        if (value === 'accent') {
            return accentColor;
        }

        return null;
    }

    #getTitleWeight(newsletter) {
        const weights = {
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700'
        };

        /** @type {'normal' | 'medium' | 'semibold' | 'bold' | string | null} */
        const settingValue = newsletter.get('title_font_weight');

        return weights[settingValue] || weights.bold;
    }

    #getTitleStrongWeight(titleWeight) {
        const numericWeight = parseInt(titleWeight, 10);

        if (isNaN(numericWeight)) {
            return '800';
        }

        // when titleWeight has been set to less than bold,
        // reduce boldness of strong to match our other strong text
        if (numericWeight < 700) {
            return '700';
        } else {
            return '800';
        }
    }

    #getImageCorners(newsletter) {
        const value = newsletter.get('image_corners');
        if (value === 'rounded') {
            return true;
        }
        return false;
    }

    #getDividerColor(newsletter) {
        const value = newsletter?.get('divider_color');

        if (value === 'accent') {
            return this.#getAccentColor();
        } else if (VALID_HEX_REGEX.test(value)) {
            return value;
        } else {
            // value === 'light'/missing/invalid
            return '#e0e7eb';
        }
    }

    #getLinkColor(newsletter, accentColor) {
        const value = newsletter.get('link_color');

        if (value === 'accent') {
            return accentColor;
        }

        if (value === null) {
            return textColorForBackgroundColor(this.#getBackgroundColor(newsletter)).hex();
        }

        if (VALID_HEX_REGEX.test(value)) {
            return value;
        }

        return accentColor; // default to accent color
    }

    #getButtonColor(newsletter, accentColor) {
        /** @type {'accent' | string | null} */
        const buttonColor = newsletter?.get('button_color');

        if (buttonColor === 'accent') {
            return accentColor;
        }

        if (buttonColor === null) {
            const backgroundColor = this.#getBackgroundColor(newsletter);
            return textColorForBackgroundColor(backgroundColor).hex();
        }

        if (VALID_HEX_REGEX.test(buttonColor)) {
            return buttonColor;
        }

        return accentColor; // default to accent color
    }

    // white/black for dark/light button colors
    // outline buttons use button color as text color but that's handled in styles
    #getButtonTextColor(newsletter, accentColor) {
        const buttonColor = this.#getButtonColor(newsletter, accentColor);
        return textColorForBackgroundColor(buttonColor).hex();
    }

    #checkIfBackgroundIsDark(newsletter) {
        const backgroundColor = this.#getBackgroundColor(newsletter);
        return textColorForBackgroundColor(backgroundColor).hex().toLowerCase() === '#ffffff';
    }

    #getHeaderBackgroundColor(newsletter, accentColor) {
        const value = newsletter?.get('header_background_color');

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

    /**
     * @private
     */
    async getTemplateData({post, newsletter, html, addPaywall, segment}) {
        const accentColor = this.#getAccentColor();
        const accentContrastColor = this.#getAccentContrastColor();

        // TODO: remove passthrough of accent color to getters
        const backgroundColor = this.#getBackgroundColor(newsletter);
        const backgroundIsDark = this.#checkIfBackgroundIsDark(newsletter);
        const postTitleColor = this.#getPostTitleColor(newsletter, accentColor);
        const titleWeight = this.#getTitleWeight(newsletter);
        const titleStrongWeight = this.#getTitleStrongWeight(titleWeight);
        const textColor = textColorForBackgroundColor(backgroundColor).hex(); // this is used by the header background color so keeping it separate from the content text color
        const linkColor = this.#getLinkColor(newsletter, accentColor);
        const hasRoundedImageCorners = this.#getImageCorners(newsletter);
        const sectionTitleColor = this.#getSectionTitleColor(newsletter, accentColor);
        const dividerColor = this.#getDividerColor(newsletter);
        const buttonColor = this.#getButtonColor(newsletter, accentColor);
        const buttonTextColor = this.#getButtonTextColor(newsletter, accentColor);
        const headerBackgroundColor = this.#getHeaderBackgroundColor(newsletter, accentColor);
        const headerBackgroundIsDark = textColorForBackgroundColor(headerBackgroundColor || backgroundColor).hex().toLowerCase() === '#ffffff';

        let buttonBorderRadius = '6px';
        if (newsletter.get('button_corners') === 'square') {
            buttonBorderRadius = '0';
        } else if (newsletter.get('button_corners') === 'pill') {
            buttonBorderRadius = '9999px';
        }

        const hasOutlineButtons = newsletter.get('button_style') === 'outline';

        const {href: headerImage, width: headerImageWidth} = await this.limitImageWidth(newsletter.get('header_image'));
        const {href: postFeatureImage, width: postFeatureImageWidth, height: postFeatureImageHeight} = await this.limitImageWidth(post.get('feature_image'));

        const timezone = this.#settingsCache.get('timezone');
        const locale = this.#getValidLocale();
        const publishedAt = (post.get('published_at') ? DateTime.fromJSDate(post.get('published_at')) : DateTime.local()).setZone(timezone).setLocale(locale).toLocaleString({
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        let authors;
        const postAuthors = await post.getLazyRelation('authors');
        if (postAuthors?.models) {
            if (postAuthors.models.length <= 2) {
                authors = postAuthors.models.map(author => author.get('name')).join(' & ');
            } else {
                authors = `${postAuthors.models[0].get('name')} & ${postAuthors.models.length - 1} others`;
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
            1,
            '--key--'
        ).href.replace('--uuid--', '%%{uuid}%%').replace('--key--', '%%{key}%%');
        const negativeLink = this.#audienceFeedbackService.buildLink(
            '--uuid--',
            post.id,
            0,
            '--key--'
        ).href.replace('--uuid--', '%%{uuid}%%').replace('--key--', '%%{key}%%');

        const commentUrl = new URL(postUrl);
        commentUrl.hash = '#ghost-comments-root';

        const hasEmailOnlyFlag = post.related('posts_meta')?.get('email_only') ?? false;

        const latestPosts = [];
        let latestPostsHasImages = false;
        if (newsletter.get('show_latest_posts')) {
            // Fetch last 3 published posts
            const {data} = await this.#models.Post.findPage({
                filter: `status:published+id:-'${post.id}'`,
                order: 'published_at DESC',
                limit: 3
            });

            for (const latestPost of data) {
                // Please also adjust email-latest-posts-image if you make changes to the image width (100 x 2 = 200 -> should be in email-latest-posts-image)
                const {href: featureImage, width: featureImageWidth, height: featureImageHeight} = await this.limitImageWidth(latestPost.get('feature_image'), 100, 100);
                const {href: featureImageMobile, width: featureImageMobileWidth, height: featureImageMobileHeight} = await this.limitImageWidth(latestPost.get('feature_image'), 600, 480);

                latestPosts.push({
                    title: this.truncateHtml(latestPost.get('title'), featureImage ? 85 : 95, featureImageMobile ? 55 : 75),
                    url: this.#getPostUrl(latestPost),
                    featureImage: featureImage ? {
                        src: featureImage,
                        width: featureImageWidth,
                        height: featureImageHeight
                    } : null,
                    featureImageMobile: featureImageMobile ? {
                        src: featureImageMobile,
                        width: featureImageMobileWidth,
                        height: featureImageMobileHeight
                    } : null,
                    excerpt: this.truncateHtml(latestPost.get('custom_excerpt') || latestPost.get('plaintext'), featureImage ? 120 : 130, featureImageMobile ? 90 : 100)
                });

                if (featureImage) {
                    latestPostsHasImages = true;
                }
            }
        }

        const bodyFont = newsletter.get('body_font_category');
        const titleFont = newsletter.get('title_font_category');
        const titleAlignment = newsletter.get('title_alignment');
        const showFeatureImage = newsletter.get('show_feature_image') && !!postFeatureImage;

        const linkStyle = newsletter.get('link_style') || 'underline';

        const data = {
            site: {
                title: this.#settingsCache.get('title'),
                url: this.#urlUtils.urlFor('home', true),
                iconUrl: this.#settingsCache.get('icon') ?
                    this.#urlUtils.urlFor('image', {
                        image: this.#settingsCache.get('icon')
                    }, true) : null
            },
            preheader: this.#getEmailPreheader(post, segment, html),
            preheaderSpacing: `${'&#8199;&#847; '.repeat(150)}${'&shy; '.repeat(200)} &nbsp;`,
            html,

            post: {
                title: post.get('title'),
                url: postUrl,
                commentUrl: commentUrl.href,
                authors,
                publishedAt,
                customExcerpt: post.get('custom_excerpt'),
                feature_image: postFeatureImage,
                feature_image_width: postFeatureImageWidth,
                feature_image_height: postFeatureImageHeight,
                feature_image_alt: post.related('posts_meta')?.get('feature_image_alt'),
                feature_image_caption: post.related('posts_meta')?.get('feature_image_caption')
            },

            newsletter: {
                name: newsletter.get('name'),
                showPostTitleSection: newsletter.get('show_post_title_section'),
                showExcerpt: newsletter.get('show_excerpt'),
                showCommentCta: newsletter.get('show_comment_cta') && this.#settingsCache.get('comments_enabled') !== 'off' && !hasEmailOnlyFlag,
                showSubscriptionDetails: newsletter.get('show_subscription_details')
            },

            hasHeaderContent: !!(
                headerImage ||
                (newsletter.get('show_header_icon') && this.#settingsCache.get('icon')) ||
                newsletter.get('show_header_title') ||
                newsletter.get('show_header_name') ||
                newsletter.get('show_post_title_section') ||
                showFeatureImage
            ),

            latestPosts,
            latestPostsHasImages,

            //CSS
            accentColor, // default to #15212A
            accentContrastColor,
            showBadge: newsletter.get('show_badge'),
            backgroundColor,
            backgroundIsDark,
            postTitleColor,
            titleWeight,
            titleStrongWeight,
            textColor,
            linkColor,
            hasRoundedImageCorners,
            buttonBorderRadius,
            sectionTitleColor,
            headerImage,
            headerImageWidth,
            showHeaderIcon: newsletter.get('show_header_icon') && this.#settingsCache.get('icon'),
            dividerColor,
            buttonColor,
            buttonTextColor,
            headerBackgroundColor,
            headerBackgroundIsDark,

            // TODO: consider moving these to newsletter property
            showHeaderTitle: newsletter.get('show_header_title'),
            showHeaderName: newsletter.get('show_header_name'),
            showFeatureImage: showFeatureImage,
            footerContent: newsletter.get('footer_content'),
            linkStyle,
            hasOutlineButtons,

            // useful data
            ctaBgColors: [
                'grey',
                'blue',
                'green',
                'yellow',
                'red',
                'pink',
                'purple'
            ],

            classes: {
                container: clsx('container', {
                    'title-serif': titleFont === 'serif'
                }),
                title: clsx('post-title', {
                    'post-title-with-excerpt': post.get('custom_excerpt'),
                    'post-title-no-excerpt': !post.get('custom_excerpt'),
                    'post-title-serif': titleFont === 'serif',
                    'post-title-left': titleAlignment === 'left'
                }),
                titleLink: clsx('post-title-link', {
                    'post-title-link-left': titleAlignment === 'left'
                }),
                excerpt: clsx('post-excerpt', {
                    'post-excerpt-with-feature-image': showFeatureImage,
                    'post-excerpt-no-feature-image': !showFeatureImage,
                    'post-excerpt-serif-serif': titleFont === 'serif' && bodyFont === 'serif',
                    'post-excerpt-serif-sans': titleFont === 'serif' && bodyFont !== 'serif',
                    'post-excerpt-left': titleAlignment === 'left'
                }),
                meta: clsx('post-meta', {
                    'post-meta-left': titleAlignment === 'left',
                    'post-meta-center': titleAlignment !== 'left'
                }),
                body: clsx({
                    'post-content-sans-serif': bodyFont === 'sans_serif',
                    'post-content': bodyFont !== 'sans_serif'
                })
            },

            // Audience feedback
            feedbackButtons: newsletter.get('feedback_enabled') ? {
                likeHref: positiveLink,
                dislikeHref: negativeLink
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
     * @returns {Promise<{href: string, width: number, height: number | null}>}
     */
    async limitImageWidth(href, visibleWidth = 600, visibleHeight = null) {
        if (!href) {
            return {
                href,
                width: 0,
                height: null
            };
        }
        if (isUnsplashImage(href)) {
            // Unsplash images have a minimum size so assuming 1200px is safe
            const unsplashUrl = new URL(href);
            unsplashUrl.searchParams.delete('w');
            unsplashUrl.searchParams.delete('h');

            unsplashUrl.searchParams.set('w', (visibleWidth * 2).toFixed(0));

            if (visibleHeight) {
                unsplashUrl.searchParams.set('h', (visibleHeight * 2).toFixed(0));
                unsplashUrl.searchParams.set('fit', 'crop');
            }

            return {
                href: unsplashUrl.href,
                width: visibleWidth,
                height: visibleHeight
            };
        } else {
            try {
                const size = await this.#imageSize.getImageSizeFromUrl(href);

                if (size.width >= visibleWidth) {
                    if (!visibleHeight) {
                        // Keep aspect ratio
                        size.height = Math.round(size.height * (visibleWidth / size.width));
                    }

                    // keep original image, just set a fixed width
                    size.width = visibleWidth;
                }

                if (visibleHeight && size.height >= visibleHeight) {
                    // keep original image, just set a fixed width
                    size.height = visibleHeight;
                }

                if (this.#storageUtils.isLocalImage(href)) {
                    // we can safely request a 1200px image - Ghost will serve the original if it's smaller
                    return {
                        href: href.replace(/\/content\/images\//, '/content/images/size/w' + (visibleWidth * 2) + (visibleHeight ? 'h' + (visibleHeight * 2) : '') + '/'),
                        width: size.width,
                        height: size.height
                    };
                }

                return {
                    href,
                    width: size.width,
                    height: size.height
                };
            } catch (err) {
                // log and proceed. Using original header image without fixed width isn't fatal.
                logging.error(err);
            }
        }

        return {
            href,
            width: 0,
            height: null
        };
    }
}

module.exports = EmailRenderer;
