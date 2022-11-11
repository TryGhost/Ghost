const _ = require('lodash');
const template = require('./template');
const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');
const moment = require('moment-timezone');
const api = require('../../api').endpoints;
const apiFramework = require('@tryghost/api-framework');
const {URL} = require('url');
const mobiledocLib = require('../../lib/mobiledoc');
const lexicalLib = require('../../lib/lexical');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');
const membersService = require('../members');
const {isUnsplashImage, isLocalContentImage} = require('@tryghost/kg-default-cards/lib/utils');
const {textColorForBackgroundColor, darkenToContrastThreshold} = require('@tryghost/color-utils');
const logging = require('@tryghost/logging');
const urlService = require('../../services/url');
const linkReplacer = require('@tryghost/link-replacer');
const linkTracking = require('../link-tracking');
const memberAttribution = require('../member-attribution');
const feedbackButtons = require('./feedback-buttons');
const labs = require('../../../shared/labs');

const ALLOWED_REPLACEMENTS = ['first_name', 'uuid'];

const PostEmailSerializer = {

    // Format a full html document ready for email by inlining CSS, adjusting links,
    // and performing any client-specific fixes
    formatHtmlForEmail(html) {
        const juiceOptions = {inlinePseudoElements: true};

        const juice = require('juice');
        let juicedHtml = juice(html, juiceOptions);

        // convert juiced HTML to a DOM-like interface for further manipulation
        // happens after inlining of CSS so we can change element types without worrying about styling

        const cheerio = require('cheerio');
        const _cheerio = cheerio.load(juicedHtml);

        // force all links to open in new tab
        _cheerio('a').attr('target', '_blank');
        // convert figure and figcaption to div so that Outlook applies margins
        _cheerio('figure, figcaption').each((i, elem) => !!(elem.tagName = 'div'));

        juicedHtml = _cheerio.html();

        // Fix any unsupported chars in Outlook
        juicedHtml = juicedHtml.replace(/&apos;/g, '&#39;');
        juicedHtml = juicedHtml.replace(/→/g, '&rarr;');
        juicedHtml = juicedHtml.replace(/–/g, '&ndash;');
        juicedHtml = juicedHtml.replace(/“/g, '&ldquo;');
        juicedHtml = juicedHtml.replace(/”/g, '&rdquo;');
        return juicedHtml;
    },

    getSite() {
        const publicSettings = settingsCache.getPublic();
        return Object.assign({}, publicSettings, {
            url: urlUtils.urlFor('home', true),
            iconUrl: publicSettings.icon ? urlUtils.urlFor('image', {image: publicSettings.icon}, true) : null
        });
    },

    /**
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
        const siteUrl = urlUtils.getSiteUrl();
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
    },

    /**
     * createPostSignupUrl
     *
     * Takes a post object. Returns the url that should be used to signup from newsletter
     *
     * @param {Object} post post object
     */
    createPostSignupUrl(post) {
        let url = urlService.getUrlByResourceId(post.id, {absolute: true});

        // For email-only posts, use site url as base
        if (post.status !== 'published' && url.match(/\/404\//)) {
            url = urlUtils.getSiteUrl();
        }

        const signupUrl = new URL(url);
        signupUrl.hash = `/portal/signup`;

        return signupUrl.href;
    },

    /**
     * replaceFeedbackLinks
     *
     * Replace the button template links with real links
     *
     * @param {string} html
     * @param {string} postId (will be url encoded)
     * @param {string} memberUuid member uuid to use in the URL (will be url encoded)
     */
    replaceFeedbackLinks(html, postId, memberUuid) {
        return feedbackButtons.generateLinks(postId, memberUuid, html);
    },

    // NOTE: serialization is needed to make sure we do post transformations such as image URL transformation from relative to absolute
    async serializePostModel(model) {
        // fetch mobiledoc/lexical rather than html and plaintext so we can render email-specific contents
        const frame = {options: {context: {user: true}, formats: 'mobiledoc,lexical'}};
        const docName = 'posts';

        await apiFramework
            .serializers
            .handle
            .output(model, {docName: docName, method: 'read'}, api.serializers.output, frame);

        return frame.response[docName][0];
    },

    // removes %% wrappers from unknown replacement strings in email content
    normalizeReplacementStrings(email) {
        // we don't want to modify the email object in-place
        const emailContent = _.pick(email, ['html', 'plaintext']);

        const EMAIL_REPLACEMENT_REGEX = /%%(\{.*?\})%%/g;
        const REPLACEMENT_STRING_REGEX = /\{(?<recipientProperty>\w*?)(?:,? *(?:"|&quot;)(?<fallback>.*?)(?:"|&quot;))?\}/;

        ['html', 'plaintext'].forEach((format) => {
            emailContent[format] = emailContent[format].replace(EMAIL_REPLACEMENT_REGEX, (replacementMatch, replacementStr) => {
                const match = replacementStr.match(REPLACEMENT_STRING_REGEX);

                if (match) {
                    const {recipientProperty} = match.groups;

                    if (ALLOWED_REPLACEMENTS.includes(recipientProperty)) {
                        // keeps wrapping %% for later replacement with real data
                        return replacementMatch;
                    }
                }

                // removes %% so output matches user supplied content
                return replacementStr;
            });
        });

        return emailContent;
    },

    /**
     * Parses email content and extracts an array of replacements with desired fallbacks
     *
     * @param {Object} email
     * @param {string} email.html
     * @param {string} email.plaintext
     *
     * @returns {Object[]} replacements
     */
    parseReplacements(email) {
        const EMAIL_REPLACEMENT_REGEX = /%%(\{.*?\})%%/g;
        const REPLACEMENT_STRING_REGEX = /\{(?<recipientProperty>\w*?)(?:,? *(?:"|&quot;)(?<fallback>.*?)(?:"|&quot;))?\}/;

        function escapeRegExp(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        const replacements = [];

        ['html', 'plaintext'].forEach((format) => {
            let result;
            while ((result = EMAIL_REPLACEMENT_REGEX.exec(email[format])) !== null) {
                const [replacementMatch, replacementStr] = result;

                // Did we already found this match and added it to the replacements array?
                if (replacements.find(r => r.match === replacementMatch && r.format === format)) {
                    continue;
                }
                const match = replacementStr.match(REPLACEMENT_STRING_REGEX);

                if (match) {
                    const {recipientProperty, fallback} = match.groups;

                    if (ALLOWED_REPLACEMENTS.includes(recipientProperty)) {
                        const id = `replacement_${replacements.length + 1}`;

                        replacements.push({
                            format,
                            id,
                            match: replacementMatch,
                            regexp: new RegExp(escapeRegExp(replacementMatch), 'g'),
                            recipientProperty: `member_${recipientProperty}`,
                            fallback
                        });
                    }
                }
            }
        });

        return replacements;
    },

    async getTemplateSettings(newsletter) {
        const accentColor = settingsCache.get('accent_color');
        const adjustedAccentColor = accentColor && darkenToContrastThreshold(accentColor, '#ffffff', 2).hex();
        const adjustedAccentContrastColor = accentColor && textColorForBackgroundColor(adjustedAccentColor).hex();

        const templateSettings = {
            headerImage: newsletter.get('header_image'),
            showHeaderIcon: newsletter.get('show_header_icon') && settingsCache.get('icon'),
            showHeaderTitle: newsletter.get('show_header_title'),
            showFeatureImage: newsletter.get('show_feature_image'),
            titleFontCategory: newsletter.get('title_font_category'),
            titleAlignment: newsletter.get('title_alignment'),
            bodyFontCategory: newsletter.get('body_font_category'),
            showBadge: newsletter.get('show_badge'),
            feedbackEnabled: newsletter.get('feedback_enabled') && labs.isSet('audienceFeedback'),
            footerContent: newsletter.get('footer_content'),
            showHeaderName: newsletter.get('show_header_name'),
            accentColor,
            adjustedAccentColor,
            adjustedAccentContrastColor
        };

        if (templateSettings.headerImage) {
            if (isUnsplashImage(templateSettings.headerImage)) {
                // Unsplash images have a minimum size so assuming 1200px is safe
                const unsplashUrl = new URL(templateSettings.headerImage);
                unsplashUrl.searchParams.set('w', '1200');

                templateSettings.headerImage = unsplashUrl.href;
                templateSettings.headerImageWidth = 600;
            } else {
                const {imageSize} = require('../../lib/image');
                try {
                    const size = await imageSize.getImageSizeFromUrl(templateSettings.headerImage);

                    if (size.width >= 600) {
                        // keep original image, just set a fixed width
                        templateSettings.headerImageWidth = 600;
                    }

                    if (isLocalContentImage(templateSettings.headerImage, urlUtils.getSiteUrl())) {
                        // we can safely request a 1200px image - Ghost will serve the original if it's smaller
                        templateSettings.headerImage = templateSettings.headerImage.replace(/\/content\/images\//, '/content/images/size/w1200/');
                    }
                } catch (err) {
                    // log and proceed. Using original header image without fixed width isn't fatal.
                    logging.error(err);
                }
            }
        }

        return templateSettings;
    },

    async serialize(postModel, newsletter, options = {isBrowserPreview: false, isTestEmail: false}) {
        const post = await this.serializePostModel(postModel);

        const timezone = settingsCache.get('timezone');
        const momentDate = post.published_at ? moment(post.published_at) : moment();
        post.published_at = momentDate.tz(timezone).format('DD MMM YYYY');

        if (post.authors) {
            if (post.authors.length <= 2) {
                post.authors = post.authors.map(author => author.name).join(' & ');
            } else if (post.authors.length > 2) {
                post.authors = `${post.authors[0].name} & ${post.authors.length - 1} others`;
            }
        }

        if (post.posts_meta) {
            post.email_subject = post.posts_meta.email_subject;
        }

        // we use post.excerpt as a hidden piece of text that is picked up by some email
        // clients as a "preview" when listing emails. Our current plaintext/excerpt
        // generation outputs links as "Link [https://url/]" which isn't desired in the preview
        if (!post.custom_excerpt && post.excerpt) {
            post.excerpt = post.excerpt.replace(/\s\[http(.*?)\]/g, '');
        }

        if (post.lexical) {
            post.html = lexicalLib.lexicalHtmlRenderer.render(
                post.lexical, {target: 'email', postUrl: post.url}
            );
        } else {
            post.html = mobiledocLib.mobiledocHtmlRenderer.render(
                JSON.parse(post.mobiledoc), {target: 'email', postUrl: post.url}
            );
        }

        // perform any email specific adjustments to the HTML render output.
        // body wrapper is required so we can get proper top-level selections
        const cheerio = require('cheerio');
        const _cheerio = cheerio.load(`<body>${post.html}</body>`);
        // remove leading/trailing HRs
        _cheerio(`
            body > hr:first-child,
            body > hr:last-child,
            body > div:first-child > hr:first-child,
            body > div:last-child > hr:last-child
        `).remove();
        post.html = _cheerio('body').html(); // () (added this comment because of a bug in the syntax highlighter in VSCode)

        // Note: we don't need to do link replacements on the plaintext here
        // because the plaintext will get recalculated on the updated post html (which already includes link replacements) in renderEmailForSegment
        post.plaintext = htmlToPlaintext.email(post.html);

        // Outlook will render feature images at full-size breaking the layout.
        // Content images fix this by rendering max 600px images - do the same for feature image here
        if (post.feature_image) {
            if (isUnsplashImage(post.feature_image)) {
                // Unsplash images have a minimum size so assuming 1200px is safe
                const unsplashUrl = new URL(post.feature_image);
                unsplashUrl.searchParams.set('w', '1200');

                post.feature_image = unsplashUrl.href;
                post.feature_image_width = 600;
            } else {
                const {imageSize} = require('../../lib/image');
                try {
                    const size = await imageSize.getImageSizeFromUrl(post.feature_image);

                    if (size.width >= 600) {
                        // keep original image, just set a fixed width
                        post.feature_image_width = 600;
                    }

                    if (isLocalContentImage(post.feature_image, urlUtils.getSiteUrl())) {
                        // we can safely request a 1200px image - Ghost will serve the original if it's smaller
                        post.feature_image = post.feature_image.replace(/\/content\/images\//, '/content/images/size/w1200/');
                    }
                } catch (err) {
                    // log and proceed. Using original feature_image without fixed width isn't fatal.
                    logging.error(err);
                }
            }
        }

        const templateSettings = await this.getTemplateSettings(newsletter);

        const render = template;

        let htmlTemplate = render({post, site: this.getSite(), templateSettings, newsletter: newsletter.toJSON()});

        // The plaintext version that is returned here is actually never really used for sending because we'll use htmlToPlaintext again later
        let result = {
            html: this.formatHtmlForEmail(htmlTemplate),
            plaintext: post.plaintext
        };

        /**
         *  If a part of the email is members-only and the post is paid-only, add a paywall:
         *  - Just before sending the email, we'll hide the paywall or paid content depending on the member segment it is sent to.
         *  - We already need to do URL-replacement on the HTML here
         *  - Link replacement cannot happen later because renderEmailForSegment is called multiple times for a single email (which would result in duplicate redirects)
        */
        const isPaidPost = post.visibility === 'paid' || post.visibility === 'tiers';

        const paywallIndex = (result.html || '').indexOf('<!--members-only-->');
        if (paywallIndex !== -1 && isPaidPost) {
            const postContentEndIdx = result.html.indexOf('<!-- POST CONTENT END -->');

            if (postContentEndIdx !== -1) {
                const paywallHTML = '<!-- PAYWALL -->' + this.renderPaywallCTA(post);

                // Append it just before the end of the post content
                result.html = result.html.slice(0, postContentEndIdx) + paywallHTML + result.html.slice(postContentEndIdx);
            }
        }

        // Now replace the links in the HTML version
        if (!options.isBrowserPreview && !options.isTestEmail && settingsCache.get('email_track_clicks')) {
            result.html = await linkReplacer.replace(result.html, async (url) => {
                // Add newsletter source attribution
                const isSite = urlUtils.isSiteUrl(url);

                if (isSite) {
                    // Add newsletter name as ref to the URL
                    url = memberAttribution.service.addEmailSourceAttributionTracking(url, newsletter);

                    // Only add post attribution to our own site (because external sites could/should not process this information)
                    url = memberAttribution.service.addPostAttributionTracking(url, post);
                } else {
                    // Add email source attribution without the newsletter name
                    url = memberAttribution.service.addEmailSourceAttributionTracking(url);
                }

                // Add link click tracking
                url = await linkTracking.service.addTrackingToUrl(url, post, '--uuid--');

                // We need to convert to a string at this point, because we need invalid string characters in the URL
                const str = url.toString().replace(/--uuid--/g, '%%{uuid}%%');
                return str;
            });
        }

        // Add buttons
        if (labs.isSet('audienceFeedback')) {
            // create unique urls for every recipient (for example, for feedback buttons)
            // Note, we need to use a different member uuid in the links because `%%{uuid}%%` would get escaped by the URL object when set as a search param
            const urlSafeToken = '--' + new Date().getTime() + 'url-safe-uuid--';
            result.html = this.replaceFeedbackLinks(result.html, post.id, urlSafeToken).replace(new RegExp(urlSafeToken, 'g'), '%%{uuid}%%');
        }

        // Clean up any unknown replacements strings to get our final content
        const {html, plaintext} = this.normalizeReplacementStrings(result);
        const data = {
            subject: post.email_subject || post.title,
            html,
            plaintext
        };

        // Add post for checking access in renderEmailForSegment (only for previews)
        data.post = post;
        return data;
    },

    /**
     * renderPaywallCTA
     *
     * outputs html for rendering paywall CTA in newsletter
     *
     * @param {Object} post Post Object
     */
    renderPaywallCTA(post) {
        const accentColor = settingsCache.get('accent_color');
        const siteTitle = settingsCache.get('title') || 'Ghost';
        const signupUrl = this.createPostSignupUrl(post);

        return `<div class="align-center" style="text-align: center;">
        <hr
            style="position: relative; display: block; width: 100%; margin: 3em 0; padding: 0; height: 1px; border: 0; border-top: 1px solid #e5eff5;">
        <h2
            style="margin-top: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; line-height: 1.11em; font-weight: 700; text-rendering: optimizeLegibility; margin: 1.5em 0 0.5em 0; font-size: 26px;">
            Subscribe to <span style="white-space: nowrap; font-size: 26px !important;">continue reading.</span></h2>
        <p style="margin: 0 auto 1.5em auto; line-height: 1.6em; max-width: 440px;">Become a paid member of ${siteTitle} to get access to all
        <span style="white-space: nowrap;">subscriber-only content.</span></p>
        <div class="btn btn-accent" style="box-sizing: border-box; width: 100%; display: table;">
            <table border="0" cellspacing="0" cellpadding="0" align="center"
                style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: auto;">
                <tbody>
                    <tr>
                        <td align="center"
                            style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; vertical-align: top; text-align: center; border-radius: 5px;"
                            valign="top" bgcolor="${accentColor}">
                            <a href="${signupUrl}"
                                style="overflow-wrap: anywhere; border: solid 1px #3498db; border-radius: 5px; box-sizing: border-box; cursor: pointer; display: inline-block; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 25px; text-decoration: none; background-color: ${accentColor}; border-color: ${accentColor}; color: #FFFFFF;"
                                target="_blank">Subscribe
                            </a>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p style="margin: 0 0 1.5em 0; line-height: 1.6em;"></p>
    </div>`;
    },

    renderEmailForSegment(email, memberSegment) {
        const cheerio = require('cheerio');

        const result = {...email};

        // Note about link tracking:
        // Don't add new HTML in here, but add it in the serialize method and surround it with the required HTML comments or attributes
        // This is because we can't replace links at this point (this is executed multiple times, once per batch and we don't want to generate duplicate links for the same email)

        // Remove the paywall or members-only content based on the current member segment
        const startMembersOnlyContent = (result.html || '').indexOf('<!--members-only-->');
        const startPaywall = result.html.indexOf('<!-- PAYWALL -->');
        let endPost = result.html.indexOf('<!-- POST CONTENT END -->');

        if (endPost === -1) {
            // Default to the end of the HTML (shouldn't happen, but just in case if we have members-only content that should get removed)
            endPost = result.html.length;
        }

        // We support the cases where there is no <!--members-only--> but there is a paywall (in case of bugs)
        // We also support the case where there is no <!-- PAYWALL --> but there is a <!--members-only--> (in case of bugs)
        if (startMembersOnlyContent !== -1 || startPaywall !== -1) {
            // By default remove the paywall if no memberSegment is passed
            let memberHasAccess = true;

            if (memberSegment && result.post) {
                let statusFilter = memberSegment === 'status:free' ? {status: 'free'} : {status: 'paid'};
                const postVisiblity = result.post.visibility;

                // For newsletter paywall, specific tiers visibility is considered on par to paid tiers
                result.post.visibility = postVisiblity === 'tiers' ? 'paid' : postVisiblity;

                memberHasAccess = membersService.contentGating.checkPostAccess(result.post, statusFilter);
            }

            if (!memberHasAccess) {
                if (startMembersOnlyContent !== -1) {
                    // Remove the members-only content, but keep the paywall (if there is a paywall)
                    result.html = result.html.slice(0, startMembersOnlyContent) + result.html.slice(startPaywall === -1 ? endPost : startPaywall);
                }
            } else {
                if (startPaywall !== -1) {
                    // Remove the paywall
                    result.html = result.html.slice(0, startPaywall) + result.html.slice(endPost);
                }
            }
        }

        const $ = cheerio.load(result.html);

        $('[data-gh-segment]').get().forEach((node) => {
            if (node.attribs['data-gh-segment'] !== memberSegment) { //TODO: replace with NQL interpretation
                $(node).remove();
            } else {
                // Getting rid of the attribute for a cleaner html output
                $(node).removeAttr('data-gh-segment');
            }
        });

        result.html = this.formatHtmlForEmail($.html());
        result.plaintext = htmlToPlaintext.email(result.html);
        delete result.post;

        return result;
    }
};

module.exports = {
    serialize: PostEmailSerializer.serialize.bind(PostEmailSerializer),
    createUnsubscribeUrl: PostEmailSerializer.createUnsubscribeUrl.bind(PostEmailSerializer),
    createPostSignupUrl: PostEmailSerializer.createPostSignupUrl.bind(PostEmailSerializer),
    renderEmailForSegment: PostEmailSerializer.renderEmailForSegment.bind(PostEmailSerializer),
    parseReplacements: PostEmailSerializer.parseReplacements.bind(PostEmailSerializer),
    // Export for tests
    _getTemplateSettings: PostEmailSerializer.getTemplateSettings.bind(PostEmailSerializer),
    _PostEmailSerializer: PostEmailSerializer
};
