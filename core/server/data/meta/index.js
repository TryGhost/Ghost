var _ = require('lodash'),
    Promise = require('bluebird'),
    config = require('../../config'),
    getUrl = require('./url'),
    getImageDimensions = require('./image-dimensions'),
    getCanonicalUrl = require('./canonical_url'),
    getAmpUrl = require('./amp_url'),
    getPaginatedUrl = require('./paginated_url'),
    getAuthorUrl = require('./author_url'),
    getRssUrl = require('./rss_url'),
    getTitle = require('./title'),
    getDescription = require('./description'),
    getCoverImage = require('./cover_image'),
    getAuthorImage = require('./author_image'),
    getAuthorFacebook = require('./author_fb_url'),
    getCreatorTwitter = require('./creator_url'),
    getKeywords = require('./keywords'),
    getPublishedDate = require('./published_date'),
    getModifiedDate = require('./modified_date'),
    getOgType = require('./og_type'),
    getStructuredData = require('./structured_data'),
    getSchema = require('./schema'),
    getExcerpt = require('./excerpt');

function getMetaData(data, root) {
    var metaData = {
        url: getUrl(data, true),
        canonicalUrl: getCanonicalUrl(data),
        ampUrl: getAmpUrl(data),
        previousUrl: getPaginatedUrl('prev', data, true),
        nextUrl: getPaginatedUrl('next', data, true),
        authorUrl: getAuthorUrl(data, true),
        rssUrl: getRssUrl(data, true),
        metaTitle: getTitle(data, root),
        metaDescription: getDescription(data, root),
        coverImage: {
            url: getCoverImage(data, true)
        },
        authorImage: {
            url: getAuthorImage(data, true)
        },
        authorFacebook: getAuthorFacebook(data),
        creatorTwitter: getCreatorTwitter(data),
        keywords: getKeywords(data),
        publishedDate: getPublishedDate(data),
        modifiedDate: getModifiedDate(data),
        ogType: getOgType(data),
        blog: _.cloneDeep(config.theme)
    };

    metaData.blog.logo = {};
    metaData.blog.logo.url = config.theme.logo ?
        config.urlFor('image', {image: config.theme.logo}, true) : config.urlFor({relativeUrl: '/ghost/img/ghosticon.jpg'}, {}, true);

    // TODO: cleanup these if statements
    if (data.post && data.post.html) {
        metaData.excerpt = getExcerpt(data.post.html, {words: 50});
    }

    if (data.post && data.post.author && data.post.author.name) {
        metaData.authorName = data.post.author.name;
    }

    return Promise.props(getImageDimensions(metaData)).then(function () {
        metaData.structuredData = getStructuredData(metaData);
        metaData.schema = getSchema(metaData, data);

        return metaData;
    });
}

module.exports = getMetaData;
