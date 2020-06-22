const Promise = require('bluebird');
const settingsCache = require('../../server/services/settings/cache');
const urlUtils = require('../../shared/url-utils');
const logging = require('../../shared/logging');
const getUrl = require('./url');
const getImageDimensions = require('./image-dimensions');
const getCanonicalUrl = require('./canonical_url');
const getAmpUrl = require('./amp_url');
const getPaginatedUrl = require('./paginated_url');
const getAuthorUrl = require('./author_url');
const getBlogLogo = require('./blog_logo');
const getRssUrl = require('./rss_url');
const getTitle = require('./title');
const getDescription = require('./description');
const getCoverImage = require('./cover_image');
const getAuthorImage = require('./author_image');
const getAuthorFacebook = require('./author_fb_url');
const getCreatorTwitter = require('./creator_url');
const getKeywords = require('./keywords');
const getPublishedDate = require('./published_date');
const getModifiedDate = require('./modified_date');
const getOgType = require('./og_type');
const getOgImage = require('./og_image');
const getTwitterImage = require('./twitter_image');
const getStructuredData = require('./structured_data');
const getSchema = require('./schema');
const getExcerpt = require('./excerpt');

function getMetaData(data, root) {
    const metaData = {
        url: getUrl(data, true),
        canonicalUrl: getCanonicalUrl(data),
        ampUrl: getAmpUrl(data),
        previousUrl: getPaginatedUrl('prev', data, true),
        nextUrl: getPaginatedUrl('next', data, true),
        authorUrl: getAuthorUrl(data, true),
        rssUrl: getRssUrl(data, true),
        metaTitle: getTitle(data, root),
        metaDescription: getDescription(data, root) || null,
        coverImage: {
            url: getCoverImage(data, true)
        },
        authorImage: {
            url: getAuthorImage(data, true)
        },
        ogImage: {
            url: getOgImage(data)
        },
        ogTitle: getTitle(data, root, {property: 'og'}),
        ogDescription: getDescription(data, root, {property: 'og'}),
        twitterImage: getTwitterImage(data, true),
        twitterTitle: getTitle(data, root, {property: 'twitter'}),
        twitterDescription: getDescription(data, root, {property: 'twitter'}),
        authorFacebook: getAuthorFacebook(data),
        creatorTwitter: getCreatorTwitter(data),
        keywords: getKeywords(data),
        publishedDate: getPublishedDate(data),
        modifiedDate: getModifiedDate(data),
        ogType: getOgType(data),
        // @TODO: pass into each meta helper - wrap each helper
        site: {
            title: settingsCache.get('title'),
            description: settingsCache.get('description'),
            url: urlUtils.urlFor('home', true),
            facebook: settingsCache.get('facebook'),
            twitter: settingsCache.get('twitter'),
            timezone: settingsCache.get('timezone'),
            navigation: settingsCache.get('navigation'),
            icon: settingsCache.get('icon'),
            cover_image: settingsCache.get('cover_image'),
            logo: getBlogLogo(),
            amp: settingsCache.get('amp')
        }
    };

    let customExcerpt;
    let metaDescription;
    let fallbackExcerpt;

    // TODO: cleanup these if statements
    // NOTE: should use 'post' OR 'page' once https://github.com/TryGhost/Ghost/issues/10042 is resolved
    if (data.post) {
        // There's a specific order for description fields (not <meta name="description" /> !!) in structured data
        // and schema.org which is used the description fields (see https://github.com/TryGhost/Ghost/issues/8793):
        // 1. CASE: custom_excerpt is populated via the UI
        // 2. CASE: no custom_excerpt, but meta_description is poplated via the UI
        // 3. CASE: fall back to automated excerpt of 50 words if neither custom_excerpt nor meta_description is provided
        // @TODO: https://github.com/TryGhost/Ghost/issues/10062
        customExcerpt = data.post.excerpt || data.post.custom_excerpt;
        metaDescription = data.post.meta_description;
        fallbackExcerpt = data.post.html ? getExcerpt(data.post.html, {words: 50}) : '';

        metaData.excerpt = customExcerpt ? customExcerpt : metaDescription ? metaDescription : fallbackExcerpt;
    }

    if (data.post && data.post.primary_author && data.post.primary_author.name) {
        metaData.authorName = data.post.primary_author.name;
    }

    return Promise.props(getImageDimensions(metaData)).then(function () {
        metaData.structuredData = getStructuredData(metaData);
        metaData.schema = getSchema(metaData, data);

        return metaData;
    }).catch(function (err) {
        logging.error(err);
        return metaData;
    });
}

module.exports = getMetaData;
