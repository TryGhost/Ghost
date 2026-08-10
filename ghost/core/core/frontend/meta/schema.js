const config = require('../../shared/config');
const socialUrls = require('@tryghost/social-urls');
const _ = require('lodash');

// NOTE: values here are intentionally NOT HTML-escaped. This object is serialized
// with JSON.stringify into an inline <script type="application/ld+json"> block by
// the ghost_head helper, which escapes the breakout-relevant characters as JSON
// \u escapes (see escapeJsonLd there). HTML-entity escaping here would be both the
// wrong layer and actively harmful — JSON-LD consumers (Google et al.) parse the
// block as JSON and never HTML-decode, so `Tom & Jerry` would be indexed as the
// literal `Tom &amp; Jerry`.

function schemaImageObject(metaDataVal) {
    let imageObject;
    if (!metaDataVal || !metaDataVal.url) {
        return null;
    }

    imageObject = {
        '@type': 'ImageObject',
        url: metaDataVal.url
    };

    if (metaDataVal.dimensions) {
        imageObject.width = metaDataVal.dimensions.width;
        imageObject.height = metaDataVal.dimensions.height;
    }

    return imageObject;
}

function schemaPublisherObject(metaDataVal) {
    let publisherObject;

    publisherObject = {
        '@type': 'Organization',
        name: metaDataVal.site.title,
        url: metaDataVal.site.url || null,
        logo: schemaImageObject(metaDataVal.site.logo) || null
    };

    return publisherObject;
}

// Creates the final schema object with values that are not null
function trimSchema(schema) {
    const schemaObject = {};

    _.each(schema, function (value, key) {
        if (value !== null && typeof value !== 'undefined') {
            schemaObject[key] = value;
        }
    });

    return schemaObject;
}

// note that website isn't included here
const SOCIAL_PLATFORMS = ['facebook', 'twitter', 'threads', 'bluesky', 'mastodon', 'tiktok', 'youtube', 'instagram', 'linkedin'];

/**
 * Build the `sameAs` array for schema.org Person objects.
 *
 * @param {Object} author   either `data.author` or `data.<post|page>.primary_author`.
 *                          Expected to contain `website` plus any supported social usernames.
 * @returns {string[]}      URLs for the author website and each populated social profile.
 */
function trimSameAs(author) {
    if (!author || Object.keys(author).length === 0) {
        return [];
    }
    
    const sameAs = [];

    if (author.website) {
        sameAs.push(author.website);
    }

    SOCIAL_PLATFORMS.forEach((platform) => {
        if (author[platform] && typeof socialUrls[platform] === 'function') {
            sameAs.push(socialUrls[platform](author[platform]));
        }
    });

    return sameAs;
}

/**
 * Build contributor objects for schema.org Article schema.
 *
 * @param {Object[]} authors - Array of author objects (excluding primary author)
 */
function buildContributorObjects(authors) {
    return authors.map(author => trimSchema({
        '@type': 'Person',
        name: author.name,
        image: author.profile_image ? schemaImageObject({url: author.profile_image}) : null,
        url: author.url || null,
        sameAs: trimSameAs(author),
        description: author.meta_description || null
    }));
}

function getPostSchema(metaData, data) {
    // CASE: metaData.excerpt for post context is populated by either the custom excerpt, the meta description,
    // or the automated excerpt of 50 words. It is empty for any other context.
    const description = metaData.excerpt || null;

    let schema;

    const context = data.page ? 'page' : 'post';

    schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        publisher: schemaPublisherObject(metaData),
        author: {
            '@type': 'Person',
            name: data[context].primary_author.name,
            image: schemaImageObject(metaData.authorImage),
            url: metaData.authorUrl,
            sameAs: trimSameAs(data[context].primary_author),
            description: data[context].primary_author.metaDescription || null
        },
        contributor: data[context].authors && data[context].authors.length > 1 ? buildContributorObjects(data[context].authors.slice(1)) : null,
        headline: metaData.metaTitle,
        url: metaData.url,
        datePublished: metaData.publishedDate,
        dateModified: metaData.modifiedDate,
        image: schemaImageObject(metaData.coverImage),
        keywords: metaData.keywords && metaData.keywords.length > 0 ?
            metaData.keywords.join(', ') : null,
        description: description,
        mainEntityOfPage: metaData.url
    };
    schema.author = trimSchema(schema.author);
    return trimSchema(schema);
}

function getHomeSchema(metaData) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        publisher: schemaPublisherObject(metaData),
        url: metaData.url,
        name: metaData.site.title,
        image: schemaImageObject(metaData.coverImage),
        mainEntityOfPage: metaData.url,
        description: metaData.metaDescription || null
    };
    return trimSchema(schema);
}

function getTagSchema(metaData, data) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Series',
        publisher: schemaPublisherObject(metaData),
        url: metaData.url,
        image: schemaImageObject(metaData.coverImage),
        name: data.tag.name,
        mainEntityOfPage: metaData.url,
        description: metaData.metaDescription || null
    };

    return trimSchema(schema);
}

function getAuthorSchema(metaData, data) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        sameAs: trimSameAs(data.author),
        name: data.author.name,
        url: metaData.authorUrl,
        image: schemaImageObject(metaData.authorImage) || schemaImageObject(metaData.coverImage),
        mainEntityOfPage: metaData.authorUrl,
        description: metaData.metaDescription || null
    };

    return trimSchema(schema);
}

function getSchema(metaData, data) {
    if (!config.isPrivacyDisabled('useStructuredData')) {
        const context = data.context ? data.context : null;
        if (_.includes(context, 'post') || _.includes(context, 'page')) {
            return getPostSchema(metaData, data);
        } else if (_.includes(context, 'home')) {
            return getHomeSchema(metaData);
        } else if (_.includes(context, 'tag')) {
            return getTagSchema(metaData, data);
        } else if (_.includes(context, 'author')) {
            return getAuthorSchema(metaData, data);
        }
    }
    return null;
}

module.exports = {getSchema, SOCIAL_PLATFORMS};
