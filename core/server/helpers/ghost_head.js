// # Ghost Head Helper
// Usage: `{{ghost_head}}`
//
// Outputs scripts and other assets at the top of a Ghost theme
//
// We use the name ghost_head to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var hbs             = require('express-hbs'),
    moment          = require('moment'),
    _               = require('lodash'),
    Promise         = require('bluebird'),

    config          = require('../config'),
    filters         = require('../filters'),

    api                 = require('../api'),
    urlHelper           = require('./url'),
    meta_description    = require('./meta_description'),
    meta_title          = require('./meta_title'),
    excerpt             = require('./excerpt'),
    tagsHelper          = require('./tags'),
    imageHelper         = require('./image'),
    blog,
    ghost_head;

function getImage(ops, context, contextObject) {
    if (context === 'home' || context === 'author') {
        contextObject.image = contextObject.cover;
    }

    ops.push(imageHelper.call(contextObject, {hash: {absolute: true}}));

    if (context === 'post' && contextObject.author) {
        ops.push(imageHelper.call(contextObject.author, {hash: {absolute: true}}));
    }

    return ops;
}

function getPaginationUrls(pagination, relativeUrl, secure, head) {
    var trimmedUrl, next, prev,
        trimmedUrlpattern = /.+(?=\/page\/\d*\/)/,
        tagOrAuthorPattern = /\/(tag)|(author)\//;

    trimmedUrl = relativeUrl.match(trimmedUrlpattern);
    if (pagination.prev) {
        prev = (pagination.prev > 1 ? '/page/' + pagination.prev + '/' : '/');
        prev = (trimmedUrl) ? trimmedUrl + prev : prev;
        head.push('<link rel="prev" href="' +
                config.urlFor({relativeUrl: prev, secure: secure}, true) + '" />'
        );
    }
    if (pagination.next) {
        next = '/page/' + pagination.next + '/';
        if (trimmedUrl) {
            next = trimmedUrl + next;
        } else if (tagOrAuthorPattern.test(relativeUrl)) {
            next = relativeUrl.slice(0, -1) + next;
        }
        head.push('<link rel="next" href="' +
                config.urlFor({relativeUrl: next, secure: secure}, true) + '" />'
        );
    }
    return head;
}

function addContextMetaData(context, data, metaData) {
    // escaped data
    metaData.metaTitle = hbs.handlebars.Utils.escapeExpression(metaData.metaTitle);
    metaData.metaDescription = metaData.metaDescription ? hbs.handlebars.Utils.escapeExpression(metaData.metaDescription) : null;

    if (context === 'author') {
        metaData.authorUrl =  hbs.handlebars.Utils.escapeExpression(blog.url + '/author/' + data.author.slug);
        metaData.ogType = 'profile';
    } else if (context === 'post') {
        metaData.publishedDate = moment(data.post.published_at).toISOString();
        metaData.modifiedDate = moment(data.post.updated_at).toISOString();
        metaData.authorUrl = hbs.handlebars.Utils.escapeExpression(blog.url + '/author/' + data.post.author.slug);
        metaData.ogType = 'article';
    }
    return metaData;
}

function initMetaData(context, data, results) {
    var metaData = {
        url: results[0].value(),
        metaDescription: results[1].value() || null,
        metaTitle: results[2].value(),
        coverImage:  results.length > 3 ? results[3].value() : null,
        authorImage: results.length > 4 ? results[4].value() : null,
        publishedDate: null,
        modifiedDate: null,
        tags: null,
        card: 'summary',
        authorUrl: null,
        ogType: 'website',
        keywords: null,
        blog: blog,
        title: blog.title
    };

    if (!metaData.metaDescription) {
        if (context === 'post') {
            metaData.metaDescription = excerpt.call(data.post, {hash: {words: '40'}}).string + '...';
        } else if (context === 'tag') {
            metaData.metaDescription = data.tag.description ? data.tag.description : null;
        }
    }
    return addContextMetaData(context, data, metaData);
}

function getStructuredData(metaData) {
    var structuredData;

    if (metaData.coverImage) {
        metaData.card = 'summary_large_image';
    }

    structuredData = {
        'og:site_name': metaData.title,
        'og:type': metaData.ogType,
        'og:title': metaData.metaTitle,
        'og:description': metaData.metaDescription,
        'og:url': metaData.url,
        'og:image': metaData.coverImage,
        'article:published_time': metaData.publishedDate,
        'article:modified_time': metaData.modifiedDate,
        'article:tag': metaData.tags,
        'twitter:card': metaData.card,
        'twitter:title': metaData.metaTitle,
        'twitter:description': metaData.metaDescription,
        'twitter:url': metaData.url,
        'twitter:image:src': metaData.coverImage
    };

    return structuredData;
}

// Creates the final schema object with values that are not null
function trimSchema(schema) {
    var schemaObject = {};

    _.each(schema, function (value, key) {
        if (value !== null && value !== undefined) {
            schemaObject[key] = value;
        }
    });
    return schemaObject;
}

function getPostSchema(metaData, data) {
    var schema = {
        '@context': 'http://schema.org',
        '@type': 'Article',
        publisher: metaData.title,
        author: {
            '@type': 'Person',
            name: data.post.author.name,
            image: metaData.authorImage,
            url: metaData.authorUrl,
            sameAs: data.post.author.website || null,
            description: data.post.author.bio || null
        },
        headline: metaData.metaTitle,
        url: metaData.url,
        datePublished: metaData.publishedDate,
        dateModified: metaData.modifiedDate,
        image: metaData.coverImage,
        keywords: metaData.keywords,
        description: metaData.metaDescription
    };
    return trimSchema(schema);
}

function getTagSchema(metaData, data) {
    var schema = {
        '@context': 'http://schema.org',
        '@type': 'Series',
        publisher: metaData.title,
        url: metaData.url,
        image: metaData.coverImage,
        name: data.tag.name,
        description: metaData.metaDescription
    };

    return trimSchema(schema);
}

function getAuthorSchema(metaData, data) {
    var schema = {
        '@context': 'http://schema.org',
        '@type': 'Person',
        sameAs: data.author.website || null,
        publisher: metaData.title,
        name: data.author.name,
        url: metaData.authorUrl,
        image: metaData.coverImage,
        description: metaData.metaDescription
    };

    return trimSchema(schema);
}

function getHomeSchema(metaData) {
    var schema = {
        '@context': 'http://schema.org',
        '@type': 'Website',
        publisher: metaData.title,
        url: metaData.url,
        image: metaData.coverImage,
        description: metaData.metaDescription
    };

    return trimSchema(schema);
}

function chooseSchema(metaData, context, data) {
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

function finaliseStructuredData(structuredData, tags, head) {
    var type;
    _.each(structuredData, function (content, property) {
        if (property === 'article:tag') {
            _.each(tags, function (tag) {
                if (tag !== '') {
                    tag = hbs.handlebars.Utils.escapeExpression(tag.trim());
                    head.push('<meta property="' + property + '" content="' + tag + '" />');
                }
            });
            head.push('');
        } else if (content !== null && content !== undefined) {
            type = property.substring(0, 7) === 'twitter' ? 'name' : 'property';
            head.push('<meta ' + type + '="' + property + '" content="' + content + '" />');
        }
    });
    return head;
}

function finaliseSchema(schema, head) {
    head.push('<script type="application/ld+json">\n' + JSON.stringify(schema, null, '    ') +
            '\n    </script>\n'
    );
    return head;
}

ghost_head = function (options) {
    // create a shortcut for theme config
    blog = config.theme;

    /*jshint unused:false*/
    var self = this,
        useStructuredData = !config.isPrivacyDisabled('useStructuredData'),
        head = [],
        safeVersion = this.safeVersion,
        ops = [],
        structuredData,
        schema,
        title = hbs.handlebars.Utils.escapeExpression(blog.title),
        context = self.context ? self.context[0] : null,
        contextObject = self[context] || blog;

    // Push Async calls to an array of promises
    ops.push(urlHelper.call(self, {hash: {absolute: true}}));
    ops.push(meta_description.call(self, options));
    ops.push(meta_title.call(self, options));
    ops = getImage(ops, context, contextObject);

    // Resolves promises then push pushes meta data into ghost_head
    return Promise.settle(ops).then(function (results) {
        if (context) {
            var metaData = initMetaData(context, self, results),
                tags = tagsHelper.call(self.post, {hash: {autolink: 'false'}}).string.split(',');

            // If there are tags - build the keywords metaData string
            if (tags[0] !== '') {
                metaData.keywords = hbs.handlebars.Utils.escapeExpression(tagsHelper.call(self.post,
                    {hash: {autolink: 'false', separator: ', '}}
                ).string);
            }

            // head is our main array that holds our meta data
            head.push('<link rel="canonical" href="' + metaData.url + '" />');
            head.push('<meta name="referrer" content="origin" />');

            // Generate context driven pagination urls
            if (self.pagination) {
                getPaginationUrls(self.pagination, self.relativeUrl, self.secure, head);
            }

            // Test to see if we are on a post page and that Structured data has not been disabled in config.js
            if (context !== 'paged' && context !== 'page' && useStructuredData) {
                // Create context driven OpenGraph and Twitter meta data
                structuredData = getStructuredData(metaData);
                // Create context driven JSONLD object
                schema = chooseSchema(metaData, context, self);
                head.push('');
                // Formats structured data and pushes to head array
                finaliseStructuredData(structuredData, tags, head);
                head.push('');
                // Formats schema script/JSONLD data and pushes to head array
                finaliseSchema(schema, head);
            }
        }
        head.push('<meta name="generator" content="Ghost ' + safeVersion + '" />');
        head.push('<link rel="alternate" type="application/rss+xml" title="' +
            title  + '" href="' + config.urlFor('rss', null, true) + '" />');
    }).then(function () {
        return api.settings.read({key: 'ghost_head'});
    }).then(function (response) {
        head.push(response.settings[0].value);
        return filters.doFilter('ghost_head', head);
    }).then(function (head) {
        var headString = _.reduce(head, function (memo, item) { return memo + '\n    ' + item; }, '');
        return new hbs.handlebars.SafeString(headString.trim());
    });
};

module.exports = ghost_head;
