const _ = require('lodash');
const juice = require('juice');
const template = require('./template');
const labsTemplate = require('./template-labs');
const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');
const labs = require('../../../shared/labs');
const moment = require('moment-timezone');
const cheerio = require('cheerio');
const api = require('../../api');
const {URL} = require('url');
const mobiledocLib = require('../../lib/mobiledoc');
const htmlToText = require('html-to-text');
const {isUnsplashImage, isLocalContentImage} = require('@tryghost/kg-default-cards/lib/utils');
const {textColorForBackgroundColor, darkenToContrastThreshold} = require('@tryghost/color-utils');
const logging = require('@tryghost/logging');

const ALLOWED_REPLACEMENTS = ['first_name'];

const getSite = () => {
    const publicSettings = settingsCache.getPublic();
    return Object.assign({}, publicSettings, {
        url: urlUtils.urlFor('home', true),
        iconUrl: publicSettings.icon ? urlUtils.urlFor('image', {image: publicSettings.icon}, true) : null
    });
};

const htmlToPlaintext = (html) => {
    // same options as used in Post model for generating plaintext but without `wordwrap: 80`
    // to avoid replacement strings being split across lines and for mail clients to handle
    // word wrapping based on user preferences
    return htmlToText.fromString(html, {
        wordwrap: false,
        ignoreImage: true,
        hideLinkHrefIfSameAsText: true,
        preserveNewlines: true,
        returnDomByDefault: true,
        uppercaseHeadings: false
    });
};

/**
 * createUnsubscribeUrl
 *
 * Takes a member uuid and returns the url that should be used to unsubscribe
 * In case of no member uuid, generates the preview unsubscribe url - `?preview=1`
 *
 * @param {string} uuid
 */
const createUnsubscribeUrl = (uuid) => {
    const siteUrl = urlUtils.getSiteUrl();
    const unsubscribeUrl = new URL(siteUrl);
    unsubscribeUrl.pathname = `${unsubscribeUrl.pathname}/unsubscribe/`.replace('//', '/');
    if (uuid) {
        unsubscribeUrl.searchParams.set('uuid', uuid);
    } else {
        unsubscribeUrl.searchParams.set('preview', '1');
    }

    return unsubscribeUrl.href;
};

// NOTE: serialization is needed to make sure we are using current API and do post transformations
//       such as image URL transformation from relative to absolute
const serializePostModel = async (model, apiVersion = 'v4') => {
    // fetch mobiledoc rather than html and plaintext so we can render email-specific contents
    const frame = {options: {context: {user: true}, formats: 'mobiledoc'}};
    const docName = 'posts';

    await api.shared
        .serializers
        .handle
        .output(model, {docName: docName, method: 'read'}, api[apiVersion].serializers.output, frame);

    return frame.response[docName][0];
};

// removes %% wrappers from unknown replacement strings in email content
const normalizeReplacementStrings = (email) => {
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
};

/**
 * Parses email content and extracts an array of replacements with desired fallbacks
 *
 * @param {Object} email
 * @param {string} email.html
 * @param {string} email.plaintext
 *
 * @returns {Object[]} replacements
 */
const parseReplacements = (email) => {
    const EMAIL_REPLACEMENT_REGEX = /%%(\{.*?\})%%/g;
    const REPLACEMENT_STRING_REGEX = /\{(?<recipientProperty>\w*?)(?:,? *(?:"|&quot;)(?<fallback>.*?)(?:"|&quot;))?\}/;

    const replacements = [];

    ['html', 'plaintext'].forEach((format) => {
        let result;
        while ((result = EMAIL_REPLACEMENT_REGEX.exec(email[format])) !== null) {
            const [replacementMatch, replacementStr] = result;
            const match = replacementStr.match(REPLACEMENT_STRING_REGEX);

            if (match) {
                const {recipientProperty, fallback} = match.groups;

                if (ALLOWED_REPLACEMENTS.includes(recipientProperty)) {
                    const id = `replacement_${replacements.length + 1}`;

                    replacements.push({
                        format,
                        id,
                        match: replacementMatch,
                        recipientProperty: `member_${recipientProperty}`,
                        fallback
                    });
                }
            }
        }
    });

    return replacements;
};

const getTemplateSettings = async () => {
    const accentColor = settingsCache.get('accent_color');
    const adjustedAccentColor = accentColor && darkenToContrastThreshold(accentColor, '#ffffff', 2).hex();
    const adjustedAccentContrastColor = accentColor && textColorForBackgroundColor(adjustedAccentColor).hex();

    const templateSettings = {
        headerImage: settingsCache.get('newsletter_header_image'),
        showHeaderIcon: settingsCache.get('newsletter_show_header_icon') && settingsCache.get('icon'),
        showHeaderTitle: settingsCache.get('newsletter_show_header_title'),
        showFeatureImage: settingsCache.get('newsletter_show_feature_image'),
        titleFontCategory: settingsCache.get('newsletter_title_font_category'),
        titleAlignment: settingsCache.get('newsletter_title_alignment'),
        bodyFontCategory: settingsCache.get('newsletter_body_font_category'),
        showBadge: settingsCache.get('newsletter_show_badge'),
        footerContent: settingsCache.get('newsletter_footer_content'),
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
};

const serialize = async (postModel, options = {isBrowserPreview: false, apiVersion: 'v4'}) => {
    const post = await serializePostModel(postModel, options.apiVersion);

    const timezone = settingsCache.get('timezone');
    const momentDate = post.published_at ? moment(post.published_at) : moment();
    post.published_at = momentDate.tz(timezone).format('DD MMM YYYY');

    post.authors = post.authors && post.authors.map(author => author.name).join(',');
    if (post.posts_meta) {
        post.email_subject = post.posts_meta.email_subject;
    }

    // we use post.excerpt as a hidden piece of text that is picked up by some email
    // clients as a "preview" when listing emails. Our current plaintext/excerpt
    // generation outputs links as "Link [https://url/]" which isn't desired in the preview
    if (!post.custom_excerpt && post.excerpt) {
        post.excerpt = post.excerpt.replace(/\s\[http(.*?)\]/g, '');
    }

    post.html = mobiledocLib.mobiledocHtmlRenderer.render(JSON.parse(post.mobiledoc), {target: 'email'});

    // perform any email specific adjustments to the mobiledoc->HTML render output
    // body wrapper is required so we can get proper top-level selections
    let _cheerio = cheerio.load(`<body>${post.html}</body>`);
    // remove leading/trailing HRs
    _cheerio(`
        body > hr:first-child,
        body > hr:last-child,
        body > div:first-child > hr:first-child,
        body > div:last-child > hr:last-child
    `).remove();
    post.html = _cheerio('body').html();

    post.plaintext = htmlToPlaintext(post.html);

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

    const templateSettings = await getTemplateSettings();

    const render = labs.isSet('emailCardSegments') ? labsTemplate : template;

    let htmlTemplate = render({post, site: getSite(), templateSettings});

    if (options.isBrowserPreview) {
        const previewUnsubscribeUrl = createUnsubscribeUrl(null);
        htmlTemplate = htmlTemplate.replace('%recipient.unsubscribe_url%', previewUnsubscribeUrl);
    }

    // Inline css to style attributes, turn on support for pseudo classes.
    const juiceOptions = {inlinePseudoElements: true};
    let juicedHtml = juice(htmlTemplate, juiceOptions);

    // convert juiced HTML to a DOM-like interface for further manipulation
    // happens after inlining of CSS so we can change element types without worrying about styling
    _cheerio = cheerio.load(juicedHtml);
    // force all links to open in new tab
    _cheerio('a').attr('target','_blank');
    // convert figure and figcaption to div so that Outlook applies margins
    _cheerio('figure, figcaption').each((i, elem) => !!(elem.tagName = 'div'));
    juicedHtml = _cheerio.html();

    // Fix any unsupported chars in Outlook
    juicedHtml = juicedHtml.replace(/&apos;/g, '&#39;');

    // Clean up any unknown replacements strings to get our final content
    const {html, plaintext} = normalizeReplacementStrings({
        html: juicedHtml,
        plaintext: post.plaintext
    });

    return {
        subject: post.email_subject || post.title,
        html,
        plaintext
    };
};

function renderEmailForSegment(email, memberSegment) {
    const result = {...email};
    const $ = cheerio.load(result.html);

    $('[data-gh-segment]').get().forEach((node) => {
        if (node.attribs['data-gh-segment'] !== memberSegment) { //TODO: replace with NQL interpretation
            $(node).remove();
        } else {
            // Getting rid of the attribute for a cleaner html output
            $(node).removeAttr('data-gh-segment');
        }
    });
    result.html = $.html();
    result.plaintext = htmlToPlaintext(result.html);

    return result;
}

module.exports = {
    serialize,
    createUnsubscribeUrl,
    renderEmailForSegment,
    parseReplacements
};
