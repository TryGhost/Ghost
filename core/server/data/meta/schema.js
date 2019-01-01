var config = require('../../config'),
    escapeExpression = require('../../services/themes/engine').escapeExpression,
    social = require('../../lib/social'),
    _ = require('lodash');

const SchemaGenerator = require('@tryghost/schema-org');
const schemaGenerator = new SchemaGenerator();

function trimSameAs(data, context) {
    var sameAs = [];

    if (context === 'post') {
        if (data.post.primary_author.website) {
            sameAs.push(escapeExpression(data.post.primary_author.website));
        }
        if (data.post.primary_author.facebook) {
            sameAs.push(social.urls.facebook(data.post.primary_author.facebook));
        }
        if (data.post.primary_author.twitter) {
            sameAs.push(social.urls.twitter(data.post.primary_author.twitter));
        }
    } else if (context === 'author') {
        if (data.author.website) {
            sameAs.push(escapeExpression(data.author.website));
        }
        if (data.author.facebook) {
            sameAs.push(social.urls.facebook(data.author.facebook));
        }
        if (data.author.twitter) {
            sameAs.push(social.urls.twitter(data.author.twitter));
        }
    }

    return sameAs;
}

function getMetaDataForSchemaType(type, metaData, rawData) {
    const data = {
        site: {
            title: metaData.blog.title,
            logo: metaData.blog.logo,
            url: metaData.blog.url
        },
        meta: {
            url: metaData.url,
            image: metaData.coverImage,
            description: metaData.metaDescription
        }
    };

    // AUTHOR
    if (type === 'author') {
        data.meta.name = rawData.author.name;
        // NOTE: metaData.authorUrl for this template only?!
        data.meta.url = metaData.authorUrl;
        data.meta.sameAs = trimSameAs(rawData, 'author');
    }

    // TAG
    if (type === 'tag') {
        data.meta.name = rawData.tag.name;
    }

    // POST
    if (type === 'post') {
        data.author = {
            url: metaData.authorUrl,
            name: rawData.post.primary_author.name,
            description: rawData.post.primary_author.metaDescription,
            // @TODO: why is this preprocessed?
            image: metaData.authorImage,
            // @TODO what?!
            sameAs: trimSameAs(rawData, 'post')
        };

        data.meta.title = metaData.metaTitle;
        data.meta.description = metaData.excerpt;
        data.meta.keywords = metaData.keywords;
        data.meta.datePublished = metaData.publishedDate;
        data.meta.dateModified = metaData.modifiedDate;
    }

    return data;
}

function getSchemaTypeFromContext(context) {
    let type = null;

    if (_.includes(context, 'post') || _.includes(context, 'page') || _.includes(context, 'amp')) {
        type = 'post';
    } else if (_.includes(context, 'home')) {
        type = 'home';
    } else if (_.includes(context, 'tag')) {
        type = 'tag';
    } else if (_.includes(context, 'author')) {
        type = 'author';
    }

    return type;
}

function buildSchema(metaData, rawData) {
    const context = rawData.context ? rawData.context : null;
    const type = getSchemaTypeFromContext(context);

    if (!type) {
        return null;
    }

    const data = getMetaDataForSchemaType(type, metaData, rawData);

    return schemaGenerator.createSchema(type, data);
}

/**
 * Check config before building schema
 */
function getSchema(metaData, rawData) {
    if (config.isPrivacyDisabled('useStructuredData')) {
        return null;
    }

    return buildSchema(metaData, rawData);
}

module.exports = getSchema;
