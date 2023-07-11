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

function trimSameAs(data, context) {
    const sameAs = [];

    if (context === 'post' || context === 'page') {
        if (data[context].primary_author.website) {
            sameAs.push(escapeExpression(data[context].primary_author.website));
        }
        if (data[context].primary_author.facebook) {
            sameAs.push(socialUrls.facebook(data[context].primary_author.facebook));
        }
        if (data[context].primary_author.twitter) {
            sameAs.push(socialUrls.twitter(data[context].primary_author.twitter));
        }
    } else if (context === 'author') {
        if (data.author.website) {
            sameAs.push(escapeExpression(data.author.website));
        }
        if (data.author.facebook) {
            sameAs.push(socialUrls.facebook(data.author.facebook));
        }
        if (data.author.twitter) {
            sameAs.push(socialUrls.twitter(data.author.twitter));
        }
    }

    return sameAs;
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
            sameAs: trimSameAs(data, context),
            description: data[context].primary_author.metaDescription ?
                escapeExpression(data[context].primary_author.metaDescription) :
                null
        },
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
        sameAs: trimSameAs(data, 'author'),
        name: escapeExpression(data.author.name),
        url: metaData.authorUrl,
        image: schemaImageObject(metaData.coverImage),
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
        if (_.includes(context, 'post') || _.includes(context, 'page') || _.includes(context, 'amp')) {
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

module.exports = getSchema;
