var config = require('../../config'),
    getUrl = require('./url'),
    getCanonicalUrl = require('./canonical_url'),
    getPreviousUrl = require('./previous_url'),
    getNextUrl = require('./next_url'),
    getAuthorUrl = require('./author_url'),
    getRssUrl = require('./rss_url'),
    getTitle = require('./title'),
    getDescription = require('./description'),
    getCoverImage = require('./cover_image'),
    getAuthorImage = require('./author_image'),
    getKeywords = require('./keywords'),
    getPublishedDate = require('./published_date'),
    getModifiedDate = require('./modified_date'),
    getOgType = require('./og_type'),
    getStructuredData = require('./structured_data'),
    getPostSchema = require('./schema');

function getMetaData(data, root) {
    var blog = config.theme, metaData;

    metaData = {
        url: getUrl(data, true),
        canonicalUrl: getCanonicalUrl(data),
        previousUrl: getPreviousUrl(data, true),
        nextUrl: getNextUrl(data, true),
        authorUrl: getAuthorUrl(data, true),
        rssUrl: getRssUrl(data, true),
        metaTitle: getTitle(data, root),
        metaDescription: getDescription(data, root),
        coverImage: getCoverImage(data, true),
        authorImage: getAuthorImage(data, true),
        keywords: getKeywords(data),
        publishedDate: getPublishedDate(data),
        modifiedDate: getModifiedDate(data),
        ogType: getOgType(data),
        blog: blog
    };

    metaData.structuredData = getStructuredData(metaData);
    metaData.schema = getPostSchema(metaData, data);

    return metaData;
}

module.exports = getMetaData;
