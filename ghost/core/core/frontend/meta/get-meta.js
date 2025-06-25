const settingsCache = require('../../shared/settings-cache');
const urlUtils = require('../../shared/url-utils');
const logging = require('@tryghost/logging');

// These are in filename order
const getAuthorFacebook = require('./author-fb-url');
const getAuthorImage = require('./author-image');
const getAuthorUrl = require('./author-url');
const getBlogLogo = require('./blog-logo');
const getCanonicalUrl = require('./canonical-url');
const getCoverImage = require('./cover-image');
const getCreatorTwitter = require('./creator-url');
const getDescription = require('./description');
const getExcerpt = require('./excerpt');
const getImageDimensions = require('./image-dimensions');
const getKeywords = require('./keywords');
const getModifiedDate = require('./modified-date');
const getOgType = require('./og-type');
const getOgImage = require('./og-image');
const getPaginatedUrl = require('./paginated-url');
const getPublishedDate = require('./published-date');
const getRssUrl = require('./rss-url');
const {getSchema} = require('./schema');
const getStructuredData = require('./structured-data');
const getTitle = require('./title');
const getTwitterImage = require('./twitter-image');
const getUrl = require('./url');

function getMetaData(data, root) {
    const metaData = {
        url: getUrl(data, true),
        canonicalUrl: getCanonicalUrl(data),
        previousUrl: getPaginatedUrl('prev', data, true),
        nextUrl: getPaginatedUrl('next', data, true),
        authorUrl: getAuthorUrl(data, true),
        rssUrl: getRssUrl(data, true),
        metaTitle: getTitle(data, root),
        metaDescription: getDescription(data, root) || null,
        excerpt: getExcerpt(data),
        coverImage: {
            url: getCoverImage(data)
        },
        authorImage: {
            url: getAuthorImage(data, true)
        },
        ogImage: {
            url: getOgImage(data)
        },
        ogTitle: getTitle(data, root, {property: 'og'}),
        ogDescription: getDescription(data, root, {property: 'og'}),
        twitterImage: getTwitterImage(data),
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
            logo: getBlogLogo()
        }
    };

    if (data.post && data.post.primary_author && data.post.primary_author.name) {
        metaData.authorName = data.post.primary_author.name;
    }

    // @TODO: wrap this in a utility function
    return getImageDimensions(metaData).then(function () {
        metaData.structuredData = getStructuredData(metaData);
        metaData.schema = getSchema(metaData, data);

        return metaData;
    }).catch(function (err) {
        logging.error(err);
        return metaData;
    });
}

module.exports = getMetaData;
