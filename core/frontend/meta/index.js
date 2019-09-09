var Promise = require('bluebird'),
    settingsCache = require('../../server/services/settings/cache'),
    urlUtils = require('../../server/lib/url-utils'),
    common = require('../../server/lib/common'),
    getUrl = require('./url'),
    getImageDimensions = require('./image-dimensions'),
    getCanonicalUrl = require('./canonical_url'),
    getAmpUrl = require('./amp_url'),
    getPaginatedUrl = require('./paginated_url'),
    getAuthorUrl = require('./author_url'),
    getBlogLogo = require('./blog_logo'),
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
    getOgImage = require('./og_image'),
    getTwitterImage = require('./twitter_image'),
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
            metaDescription: getDescription(data, root) || null,
            coverImage: {
                url: getCoverImage(data, true)
            },
            authorImage: {
                url: getAuthorImage(data, true)
            },
            ogImage: {
                url: getOgImage(data, true)
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
                timezone: settingsCache.get('active_timezone'),
                navigation: settingsCache.get('navigation'),
                icon: settingsCache.get('icon'),
                cover_image: settingsCache.get('cover_image'),
                logo: getBlogLogo(),
                amp: settingsCache.get('amp')
            }
        },
        customExcerpt,
        metaDescription,
        fallbackExcerpt;

    // TODO: cleanup these if statements
    if (data.post || data.page) {
        // There's a specific order for description fields (not <meta name="description" /> !!) in structured data
        // and schema.org which is used the description fields (see https://github.com/TryGhost/Ghost/issues/8793):
        // 1. CASE: custom_excerpt is populated via the UI
        // 2. CASE: no custom_excerpt, but meta_description is poplated via the UI
        // 3. CASE: fall back to automated excerpt of 50 words if neither custom_excerpt nor meta_description is provided
        // @NOTE: v2 returns a calculated `post.excerpt`. v0.1 does not
        // See https://github.com/TryGhost/Ghost/issues/10062.
        // @TODO: simplify or remove if we drop v0.1 re
        const prop = data.post ? 'post' : 'page';
        customExcerpt = data[prop].excerpt || data[prop].custom_excerpt;
        metaDescription = data[prop].meta_description;
        fallbackExcerpt = data[prop].html ? getExcerpt(data[prop].html, {words: 50}) : '';

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
        common.logging.error(err);
        return metaData;
    });
}

module.exports = getMetaData;
