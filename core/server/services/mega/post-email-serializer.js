const _ = require('lodash');
const juice = require('juice');
const template = require('./template');
const config = require('../../../shared/config');
const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../../shared/url-utils');
const moment = require('moment-timezone');
const cheerio = require('cheerio');
const api = require('../../api');
const {URL} = require('url');
const mobiledocLib = require('../../lib/mobiledoc');
const htmlToText = require('html-to-text');

const ALLOWED_REPLACEMENTS = ['first_name'];

const getSite = () => {
    const publicSettings = settingsCache.getPublic();
    return Object.assign({}, publicSettings, {
        url: urlUtils.urlFor('home', true),
        iconUrl: publicSettings.icon ? urlUtils.urlFor('image', {image: publicSettings.icon}, true) : null
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
const serializePostModel = async (model) => {
    // fetch mobiledoc rather than html and plaintext so we can render email-specific contents
    const frame = {options: {context: {user: true}, formats: 'mobiledoc'}};
    const apiVersion = model.get('api_version') || 'v3';
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

// parses email content and extracts an array of replacements with desired fallbacks
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

const serialize = async (postModel, options = {isBrowserPreview: false}) => {
    const post = await serializePostModel(postModel);

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
    // same options as used in Post model for generating plaintext but without `wordwrap: 80`
    // to avoid replacement strings being split across lines and for mail clients to handle
    // word wrapping based on user preferences
    post.plaintext = htmlToText.fromString(post.html, {
        wordwrap: false,
        ignoreImage: true,
        hideLinkHrefIfSameAsText: true,
        preserveNewlines: true,
        returnDomByDefault: true,
        uppercaseHeadings: false
    });

    const templateConfig = config.get('members:emailTemplate');
    let htmlTemplate = template({post, site: getSite(), templateConfig});
    if (options.isBrowserPreview) {
        const previewUnsubscribeUrl = createUnsubscribeUrl();
        htmlTemplate = htmlTemplate.replace('%recipient.unsubscribe_url%', previewUnsubscribeUrl);
    }

    // Inline css to style attributes, turn on support for pseudo classes.
    const juiceOptions = {inlinePseudoElements: true};
    let juicedHtml = juice(htmlTemplate, juiceOptions);

    // convert juiced HTML to a DOM-like interface for further manipulation
    // happens after inlining of CSS so we can change element types without worrying about styling
    let _cheerio = cheerio.load(juicedHtml);
    // force all links to open in new tab
    _cheerio('a').attr('target','_blank');
    // convert figure and figcaption to div so that Outlook applies margins
    _cheerio('figure, figcaption').each((i, elem) => (elem.tagName = 'div'));
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

module.exports = {
    serialize,
    createUnsubscribeUrl,
    parseReplacements
};
