const juice = require('juice');
const template = require('./template');
const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../lib/url-utils');
const moment = require('moment');
const cheerio = require('cheerio');
const api = require('../../api');
const {URL} = require('url');
const mobiledocLib = require('../../lib/mobiledoc');
const htmlToText = require('html-to-text');

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

const serialize = async (postModel, options = {isBrowserPreview: false}) => {
    const post = await serializePostModel(postModel);

    post.published_at = post.published_at ? moment(post.published_at).format('DD MMM YYYY') : moment().format('DD MMM YYYY');
    post.authors = post.authors && post.authors.map(author => author.name).join(',');
    if (post.posts_meta) {
        post.email_subject = post.posts_meta.email_subject;
    }
    post.html = mobiledocLib.mobiledocHtmlRenderer.render(JSON.parse(post.mobiledoc), {target: 'email'});
    // same options as used in Post model for generating plaintext but without `wordwrap: 80`
    // to avoid replacement strings being split across lines and for mail clients to handle
    // word wrapping based on user preferences
    post.plaintext = htmlToText.fromString(post.html, {
        ignoreImage: true,
        hideLinkHrefIfSameAsText: true,
        preserveNewlines: true,
        returnDomByDefault: true,
        uppercaseHeadings: false
    });

    let htmlTemplate = template({post, site: getSite()});
    if (options.isBrowserPreview) {
        const previewUnsubscribeUrl = createUnsubscribeUrl();
        htmlTemplate = htmlTemplate.replace('%recipient.unsubscribe_url%', previewUnsubscribeUrl);
    }

    let juicedHtml = juice(htmlTemplate);

    // Force all links to open in new tab
    let _cheerio = cheerio.load(juicedHtml);
    _cheerio('a').attr('target','_blank');
    juicedHtml = _cheerio.html();
    return {
        subject: post.email_subject || post.title,
        html: juicedHtml,
        plaintext: post.plaintext
    };
};

module.exports = {
    serialize,
    createUnsubscribeUrl
};
