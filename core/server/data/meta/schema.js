var config = require('../../config'),
    hbs = require('express-hbs'),
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

function getPostSchema(metaData, data) {
    var schema = {
        '@context': 'http://schema.org',
        '@type': 'Article',
        publisher: metaData.blog.title,
        author: {
            '@type': 'Person',
            name: escapeExpression(data.post.author.name),
            image: metaData.authorImage,
            url: metaData.authorUrl,
            sameAs: data.post.author.website || null,
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
        description: metaData.metaDescription ?
        escapeExpression(metaData.metaDescription) :
        null
    };
    schema.author = trimSchema(schema.author);
    return trimSchema(schema);
}

function getHomeSchema(metaData) {
    var schema = {
        '@context': 'http://schema.org',
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
        '@context': 'http://schema.org',
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
        '@context': 'http://schema.org',
        '@type': 'Person',
        sameAs: data.author.website || null,
        publisher: escapeExpression(metaData.blog.title),
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
        if (context === 'post') {
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
