const config = require('../../shared/config');
const escapeExpression = require('../services/theme-engine/engine').escapeExpression;
const socialUrls = require('@tryghost/social-urls');
const _ = require('lodash');

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
        name: escapeExpression(metaDataVal.site.title),
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
        sameAs.push(escapeExpression(author.website));
    }

    SOCIAL_PLATFORMS.forEach((platform) => {
        if (author[platform] && typeof socialUrls[platform] === 'function') {
            sameAs.push(escapeExpression(socialUrls[platform](author[platform])));
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
        name: escapeExpression(author.name),
        image: author.profile_image ? schemaImageObject({url: author.profile_image}) : null,
        url: author.url || null,
        sameAs: trimSameAs(author),
        description: author.meta_description ?
            escapeExpression(author.meta_description) :
            null
    }));
}

function getPostSchema(metaData, data) {
    // CASE: metaData.excerpt for post context is populated by either the custom excerpt, the meta description,
    // or the automated excerpt of 50 words. It is empty for any other context.
    const description = metaData.excerpt ? escapeExpression(metaData.excerpt) : null;

    let schema;

    const context = data.page ? 'page' : 'post';

    schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        publisher: schemaPublisherObject(metaData),
        author: {
            '@type': 'Person',
            name: escapeExpression(data[context].primary_author.name),
            image: schemaImageObject(metaData.authorImage),
            url: metaData.authorUrl,
            sameAs: trimSameAs(data[context].primary_author),
            description: data[context].primary_author.metaDescription ?
                escapeExpression(data[context].primary_author.metaDescription) :
                null
        },
        contributor: data[context].authors && data[context].authors.length > 1 ? buildContributorObjects(data[context].authors.slice(1)) : null,
        headline: escapeExpression(metaData.metaTitle),
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
        description: metaData.metaDescription ?
            escapeExpression(metaData.metaDescription) :
            null
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
        description: metaData.metaDescription ?
            escapeExpression(metaData.metaDescription) :
            null
    };

    return trimSchema(schema);
}

function getAuthorSchema(metaData, data) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        sameAs: trimSameAs(data.author),
        name: escapeExpression(data.author.name),
        url: metaData.authorUrl,
        image: schemaImageObject(metaData.authorImage) || schemaImageObject(metaData.coverImage),
        mainEntityOfPage: metaData.authorUrl,
        description: metaData.metaDescription ?
            escapeExpression(metaData.metaDescription) :
            null
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
