/* eslint-disable no-unused-vars */

const logging = require('@tryghost/logging');
const fs = require('fs').promises;
const path = require('path');
const {isUnsplashImage} = require('@tryghost/kg-default-cards/lib/utils');
const {textColorForBackgroundColor, darkenToContrastThreshold} = require('@tryghost/color-utils');
const {DateTime} = require('luxon');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');
const tpl = require('@tryghost/tpl');
const cheerio = require('cheerio');

const messages = {
    subscriptionStatus: {
        free: '',
        expired: 'Your subscription has expired.',
        canceled: 'Your subscription has been canceled and will expire on {date}. You can resume your subscription via your account settings.',
        active: 'Your subscription will renew on {date}.',
        trial: 'Your free trial ends on {date}, at which time you will be charged the regular price. You can always cancel before then.',
        complimentaryExpires: 'Your subscription will expire on {date}.',
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

function formatDateLong(date, timezone) {
    return DateTime.fromJSDate(date).setZone(timezone).setLocale('en-gb').toLocaleString({
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    #labs;
    #models;

    /**
     * @param {object} dependencies
     * @param {object} dependencies.settingsCache
     * @param {{getNoReplyAddress(): string, getMembersSupportAddress(): string}} dependencies.settingsHelpers
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
     * @param {object} dependencies.outboundLinkTagger
     * @param {object} dependencies.labs
     * @param {{Post: object}} dependencies.models
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
        outboundLinkTagger,
        labs,
        models
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
        this.#outboundLinkTagger = outboundLinkTagger;
        this.#labs = labs;
        this.#models = models;
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

        const $ = cheerio.load(html);

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

    async renderPostBaseHtml(post) {
        const postUrl = this.#getPostUrl(post);
        let html;
        if (post.get('lexical')) {
            // only lexical's renderer is async
            html = await this.#renderers.lexical.render(
                post.get('lexical'), {target: 'email', postUrl}
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
        let html = await this.renderPostBaseHtml(post);

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

        let $ = cheerio.load(html);

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
                    url = this.#outboundLinkTagger.addToUrl(url, newsletter);

                    // Only add post attribution to our own site (because external sites could/should not process this information)
                    url = this.#memberAttributionService.addPostAttributionTracking(url, post);
                } else {
                    // Add email source attribution without the newsletter name
                    url = this.#outboundLinkTagger.addToUrl(url);
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
        juice.heightElements = ['TABLE', 'TD', 'TH'];
        juice.widthElements = ['TABLE', 'TD', 'TH'];
        html = juice(html, {inlinePseudoElements: true, removeStyleTags: true});

        // happens after inlining of CSS so we can change element types without worrying about styling
        $ = cheerio.load(html);

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
        if (member.status === 'free') {
            // Not really used, but as a backup
            return tpl(messages.subscriptionStatus.free);
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
                return tpl(messages.subscriptionStatus.expired);
            }

            if (!activeSubscription) {
                if (!member.tiers[0]?.expiry_at) {
                    return tpl(messages.subscriptionStatus.complimentaryInfinite);
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
                const date = formatDateLong(activeSubscription.trial_end_at, timezone);
                return tpl(messages.subscriptionStatus.trial, {date});
            }

            const date = formatDateLong(activeSubscription.current_period_end, timezone);
            if (activeSubscription.cancel_at_period_end) {
                return tpl(messages.subscriptionStatus.canceled, {date});
            }

            return tpl(messages.subscriptionStatus.active, {date});
        }

        const expires = member.tiers[0]?.expiry_at ?? null;

        if (expires) {
            const timezone = this.#settingsCache.get('timezone');
            const date = formatDateLong(expires, timezone);
            return tpl(messages.subscriptionStatus.complimentaryExpires, {date});
        }

        return tpl(messages.subscriptionStatus.complimentaryInfinite);
    }

    /**
     * Note that we only look in HTML because plaintext and HTML are essentially the same content
     * @returns {ReplacementDefinition[]}
     */
    buildReplacementDefinitions({html, newsletterUuid}) {
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
                    return member.createdAt ? formatDateLong(member.createdAt, timezone) : '';
                }
            },
            {
                id: 'status',
                getValue: (member) => {
                    if (member.status === 'comped') {
                        return 'complimentary';
                    }
                    if (this.isMemberTrialing(member)) {
                        return 'trialing';
                    }
                    return member.status;
                }
            },
            {
                id: 'status_text',
                getValue: (member) => {
                    return this.getMemberStatusText(member);
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
        if (this.#labs.isSet('emailCustomization')) {
            const cssPartialSource = await fs.readFile(path.join(__dirname, './email-templates/partials/', `styles.hbs`), 'utf8');
            this.#handlebars.registerPartial('styles', cssPartialSource);
        } else {
            const cssPartialSource = await fs.readFile(path.join(__dirname, './email-templates/partials/', `styles-old.hbs`), 'utf8');
            this.#handlebars.registerPartial('styles', cssPartialSource);
        }

        const paywallPartial = await fs.readFile(path.join(__dirname, './email-templates/partials/', `paywall.hbs`), 'utf8');
        this.#handlebars.registerPartial('paywall', paywallPartial);

        const feedbackButtonPartial = await fs.readFile(path.join(__dirname, './email-templates/partials/', `feedback-button.hbs`), 'utf8');
        this.#handlebars.registerPartial('feedbackButton', feedbackButtonPartial);

        const feedbackButtonMobilePartial = await fs.readFile(path.join(__dirname, './email-templates/partials/', `feedback-button-mobile.hbs`), 'utf8');
        this.#handlebars.registerPartial('feedbackButtonMobile', feedbackButtonMobilePartial);

        const latestPostsPartial = await fs.readFile(path.join(__dirname, './email-templates/partials/', `latest-posts.hbs`), 'utf8');
        this.#handlebars.registerPartial('latestPosts', latestPostsPartial);

        // Actual template
        if (this.#labs.isSet('emailCustomization')) {
            const htmlTemplateSource = await fs.readFile(path.join(__dirname, './email-templates/', `template.hbs`), 'utf8');
            this.#renderTemplate = this.#handlebars.compile(Buffer.from(htmlTemplateSource).toString());
        } else {
            const htmlTemplateSource = await fs.readFile(path.join(__dirname, './email-templates/', `template-old.hbs`), 'utf8');
            this.#renderTemplate = this.#handlebars.compile(Buffer.from(htmlTemplateSource).toString());
        }
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
     * @param {number} maxLengthMobile should be larger than maxLength
     * @returns
     */
    truncateHtml(text, maxLength, maxLengthMobile) {
        if (!maxLengthMobile || maxLength >= maxLengthMobile) {
            return escapeHtml(this.truncateText(text, maxLength));
        }
        if (text && text.length > maxLength) {
            if (text.length <= maxLengthMobile) {
                return escapeHtml(text.substring(0, maxLength - 1)) + '<span class="mobile-only">' + escapeHtml(text.substring(maxLength - 1, maxLengthMobile - 1)) + '</span>' + '<span class="hide-mobile">…</span>';
            }
            return escapeHtml(text.substring(0, maxLength - 1)) + '<span class="mobile-only">' + escapeHtml(text.substring(maxLength - 1, maxLengthMobile - 1)) + '</span>' + '…';
        } else {
            return escapeHtml(text ?? '');
        }
    }

    #getBackgroundColor(newsletter) {
        /** @type {'light' | 'dark' | string | null} */
        const value = newsletter.get('background_color');

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value)) {
            return value;
        }

        if (value === 'dark') {
            return '#15212a';
        }

        // value === dark, value === null, value is not valid hex
        return '#ffffff';
    }

    #getBorderColor(newsletter, accentColor) {
        /** @type {'transparent' | 'accent' | 'dark' | string | null} */
        const value = newsletter.get('border_color');

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value)) {
            return value;
        }

        if (value === 'auto') {
            const backgroundColor = this.#getBackgroundColor(newsletter);
            return textColorForBackgroundColor(backgroundColor).hex();
        }

        if (value === 'accent') {
            return accentColor;
        }

        // value === 'transparent', value === null, value is not valid hex
        return null;
    }

    #getTitleColor(newsletter, accentColor) {
        /** @type {'accent' | 'auto' | string | null} */
        const value = newsletter.get('title_color');

        const validHex = /#([0-9a-f]{3}){1,2}$/i;

        if (validHex.test(value)) {
            return value;
        }

        if (value === 'accent') {
            return accentColor;
        }

        // value === 'auto', value === null, value is not valid hex
        const backgroundColor = this.#getBackgroundColor(newsletter);
        return textColorForBackgroundColor(backgroundColor).hex();
    }

    /**
     * @private
     */
    async getTemplateData({post, newsletter, html, addPaywall, segment}) {
        let accentColor = this.#settingsCache.get('accent_color') || '#15212A';
        let adjustedAccentColor;
        let adjustedAccentContrastColor;
        try {
            adjustedAccentColor = accentColor && darkenToContrastThreshold(accentColor, '#ffffff', 2).hex();
            adjustedAccentContrastColor = accentColor && textColorForBackgroundColor(adjustedAccentColor).hex();
        } catch (e) {
            logging.error(e);
            accentColor = '#15212A';
        }

        const backgroundColor = this.#getBackgroundColor(newsletter);
        const backgroundIsDark = textColorForBackgroundColor(backgroundColor).hex().toLowerCase() === '#ffffff';
        const borderColor = this.#getBorderColor(newsletter, accentColor);
        const secondaryBorderColor = textColorForBackgroundColor(backgroundColor).alpha(0.12).toString();
        const titleColor = this.#getTitleColor(newsletter, accentColor);
        const textColor = textColorForBackgroundColor(backgroundColor).hex();
        const secondaryTextColor = textColorForBackgroundColor(backgroundColor).alpha(0.5).toString();
        const linkColor = backgroundIsDark ? '#ffffff' : accentColor;

        const {href: headerImage, width: headerImageWidth} = await this.limitImageWidth(newsletter.get('header_image'));
        const {href: postFeatureImage, width: postFeatureImageWidth, height: postFeatureImageHeight} = await this.limitImageWidth(post.get('feature_image'));

        const timezone = this.#settingsCache.get('timezone');
        const publishedAt = (post.get('published_at') ? DateTime.fromJSDate(post.get('published_at')) : DateTime.local()).setZone(timezone).setLocale('en-gb').toLocaleString({
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
            1
        ).href.replace('--uuid--', '%%{uuid}%%');
        const negativeLink = this.#audienceFeedbackService.buildLink(
            '--uuid--',
            post.id,
            0
        ).href.replace('--uuid--', '%%{uuid}%%');

        const commentUrl = new URL(postUrl);
        commentUrl.hash = '#ghost-comments';

        const hasEmailOnlyFlag = post.related('posts_meta')?.get('email_only') ?? false;

        const latestPosts = [];
        let latestPostsHasImages = false;
        if (newsletter.get('show_latest_posts')) {
            // Fetch last 3 published posts
            const {data} = await this.#models.Post.findPage({
                filter: 'status:published+id:-' + post.id,
                order: 'published_at DESC',
                limit: 3
            });

            for (const latestPost of data) {
                // Please also adjust email-latest-posts-image if you make changes to the image width (100 x 2 = 200 -> should be in email-latest-posts-image)
                const {href: featureImage, width: featureImageWidth, height: featureImageHeight} = await this.limitImageWidth(latestPost.get('feature_image'), 100, 100);
                const {href: featureImageMobile, width: featureImageMobileWidth, height: featureImageMobileHeight} = await this.limitImageWidth(latestPost.get('feature_image'), 600, 480);

                latestPosts.push({
                    title: this.truncateHtml(latestPost.get('title'), featureImage ? 85 : 105, 105),
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
                    excerpt: this.truncateHtml(latestPost.get('custom_excerpt') || latestPost.get('plaintext'), featureImage ? 60 : 70, 105)
                });

                if (featureImage) {
                    latestPostsHasImages = true;
                }
            }
        }

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
            html,

            post: {
                title: post.get('title'),
                url: postUrl,
                commentUrl: commentUrl.href,
                authors,
                publishedAt,
                feature_image: postFeatureImage,
                feature_image_width: postFeatureImageWidth,
                feature_image_height: postFeatureImageHeight,
                feature_image_alt: post.related('posts_meta')?.get('feature_image_alt'),
                feature_image_caption: post.related('posts_meta')?.get('feature_image_caption')
            },

            newsletter: {
                name: newsletter.get('name'),
                showPostTitleSection: newsletter.get('show_post_title_section'),
                showCommentCta: newsletter.get('show_comment_cta') && this.#settingsCache.get('comments_enabled') !== 'off' && !hasEmailOnlyFlag,
                showSubscriptionDetails: newsletter.get('show_subscription_details')
            },
            latestPosts,
            latestPostsHasImages,

            //CSS
            accentColor: accentColor, // default to #15212A
            adjustedAccentColor: adjustedAccentColor || '#3498db', // default to #3498db
            adjustedAccentContrastColor: adjustedAccentContrastColor || '#ffffff', // default to #ffffff
            showBadge: newsletter.get('show_badge'),
            backgroundColor: backgroundColor,
            backgroundIsDark: backgroundIsDark,
            borderColor: borderColor,
            secondaryBorderColor: secondaryBorderColor,
            titleColor: titleColor,
            textColor: textColor,
            secondaryTextColor: secondaryTextColor,
            linkColor: linkColor,

            headerImage,
            headerImageWidth,
            showHeaderIcon: newsletter.get('show_header_icon') && this.#settingsCache.get('icon'),

            // TODO: consider moving these to newsletter property
            showHeaderTitle: newsletter.get('show_header_title'),
            showHeaderName: newsletter.get('show_header_name'),
            showFeatureImage: newsletter.get('show_feature_image') && !!postFeatureImage,
            footerContent: newsletter.get('footer_content'),

            classes: {
                title: 'post-title' + (newsletter.get('title_font_category') === 'serif' ? ` post-title-serif` : ``) + (newsletter.get('title_alignment') === 'left' ? ` post-title-left` : ``),
                titleLink: 'post-title-link' + (newsletter.get('title_alignment') === 'left' ? ` post-title-link-left` : ``),
                meta: 'post-meta' + (newsletter.get('title_alignment') === 'left' ? ` post-meta-left` : ` post-meta-center`),
                body: newsletter.get('body_font_category') === 'sans_serif' ? `post-content-sans-serif` : `post-content`
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
