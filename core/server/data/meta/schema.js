var config = require('../../config'),
    hbs = require('express-hbs'),
    socialUrls = require('../../utils/social-urls'),
    escapeExpression = hbs.handlebars.Utils.escapeExpression,
    _ = require('lodash');

// Creates the final schema object with values that are not null
function trimSchema(schema) {
    var schemaObject = {};

    _.each(schema, function (value, key) {
        if (value !== null && typeof value !== 'undefined') {
            schemaObject[key] = value;
        }
    });
    return schemaObject;
}

function trimSameAs(data, context) {
    var sameAs = [];

    if (context === 'post') {
        if (data.post.author.website) {
            sameAs.push(data.post.author.website);
        }
        if (data.post.author.facebook) {
            sameAs.push(socialUrls.facebookUrl(data.post.author.facebook));
        }
        if (data.post.author.twitter) {
            sameAs.push(socialUrls.twitterUrl(data.post.author.twitter));
        }
    } else if (context === 'author') {
        if (data.author.website) {
            sameAs.push(data.author.website);
        }
        if (data.author.facebook) {
            sameAs.push(socialUrls.facebookUrl(data.author.facebook));
        }
        if (data.author.twitter) {
            sameAs.push(socialUrls.twitterUrl(data.author.twitter));
        }
    }

    return sameAs;
}

function getPostSchema(metaData, data) {
    var description = metaData.metaDescription ? escapeExpression(metaData.metaDescription) :
        (metaData.excerpt ? escapeExpression(metaData.excerpt) : null),
        schema;

    schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        publisher: {
            '@type': 'Organization',
            name: escapeExpression(metaData.blog.title),
            logo: metaData.blog.logo || null
        },
        author: {
            '@type': 'Person',
            name: escapeExpression(data.post.author.name),
            image: metaData.authorImage,
            url: metaData.authorUrl,
            sameAs: trimSameAs(data, 'post'),
            description: data.post.author.bio ?
            escapeExpression(data.post.author.bio) :
            null
        },
        headline: escapeExpression(metaData.metaTitle),
        url: metaData.url,
        datePublished: metaData.publishedDate,
        dateModified: metaData.modifiedDate,
        image: metaData.coverImage,
        keywords: metaData.keywords && metaData.keywords.length > 0 ?
            metaData.keywords.join(', ') : null,
        description: description
    };
    schema.author = trimSchema(schema.author);
    return trimSchema(schema);
}

function getHomeSchema(metaData) {
    var schema = {
        '@context': 'https://schema.org',
        '@type': 'Website',
        publisher: escapeExpression(metaData.blog.title),
        url: metaData.url,
        image: metaData.coverImage,
        description: metaData.metaDescription ?
        escapeExpression(metaData.metaDescription) :
        null
    };
    return trimSchema(schema);
}

function getTagSchema(metaData, data) {
    var schema = {
        '@context': 'https://schema.org',
        '@type': 'Series',
        publisher: escapeExpression(metaData.blog.title),
        url: metaData.url,
        image: metaData.coverImage,
        name: data.tag.name,
        description: metaData.metaDescription ?
        escapeExpression(metaData.metaDescription) :
        null
    };

    return trimSchema(schema);
}

function getAuthorSchema(metaData, data) {
    var schema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        sameAs: trimSameAs(data, 'author'),
        name: escapeExpression(data.author.name),
        url: metaData.authorUrl,
        image: metaData.coverImage,
        description: metaData.metaDescription ?
        escapeExpression(metaData.metaDescription) :
        null
    };

    return trimSchema(schema);
}

function getSchema(metaData, data) {
    if (!config.isPrivacyDisabled('useStructuredData')) {
        var context = data.context ? data.context[0] : null;
        if (context === 'post' || context === 'page') {
            return getPostSchema(metaData, data);
        } else if (context === 'home') {
            return getHomeSchema(metaData);
        } else if (context === 'tag') {
            return getTagSchema(metaData, data);
        } else if (context === 'author') {
            return getAuthorSchema(metaData, data);
        }
    }
    return null;
}

module.exports = getSchema;
