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
    ghost_head;

ghost_head = function (options) {
    /*jshint unused:false*/
    var self = this,
        blog = config.theme,
        useStructuredData = !config.isPrivacyDisabled('useStructuredData'),
        head = [],
        majorMinor = /^(\d+\.)?(\d+)/,
        trimmedVersion = this.version,
        trimmedUrlpattern = /.+(?=\/page\/\d*\/)/,
        tagOrAuthorPattern = /\/(tag)|(author)\//,
        trimmedUrl, next, prev, tags,
        ops = [],
        structuredData,
        coverImage, authorImage, keywords,
        schema,
        title = hbs.handlebars.Utils.escapeExpression(blog.title);

    trimmedVersion = trimmedVersion ? trimmedVersion.match(majorMinor)[0] : '?';
    // Push Async calls to an array of promises
    ops.push(urlHelper.call(self, {hash: {absolute: true}}));
    ops.push(meta_description.call(self));
    ops.push(meta_title.call(self));
    if (self.post) {
        ops.push(imageHelper.call(self.post, {hash: {absolute:true}}));

        if (self.post.author) {
            ops.push(imageHelper.call(self.post.author, {hash: {absolute:true}}));
        }
    }

    // Resolves promises then push pushes meta data into ghost_head
    return Promise.settle(ops).then(function (results) {
        var url = results[0].value(),
            metaDescription = results[1].value(),
            metaTitle = results[2].value(),
            coverImage = results.length > 3 ? results[3].value() : null,
            authorImage = results.length > 4 ? results[4].value() : null,
            publishedDate, modifiedDate,
            tags = tagsHelper.call(self.post, {hash: {autolink: 'false'}}).string.split(','),
            card = 'summary',
            type, authorUrl;

        if (!metaDescription) {
            metaDescription = excerpt.call(self.post, {hash: {words: '40'}}).string;
        }
        if (tags[0] !== '') {
            keywords = hbs.handlebars.Utils.escapeExpression(tagsHelper.call(self.post, {hash: {autolink: 'false', seperator: ', '}}).string);
        }
        head.push('<link rel="canonical" href="' + url + '" />');

        if (self.pagination) {
            trimmedUrl = self.relativeUrl.match(trimmedUrlpattern);
            if (self.pagination.prev) {
                prev = (self.pagination.prev > 1 ? prev = '/page/' + self.pagination.prev + '/' : prev = '/');
                prev = (trimmedUrl) ? trimmedUrl + prev : prev;
                head.push('<link rel="prev" href="' + config.urlFor({relativeUrl: prev, secure: self.secure}, true) + '" />');
            }
            if (self.pagination.next) {
                next = '/page/' + self.pagination.next + '/';
                if (trimmedUrl) {
                    next = trimmedUrl + next;
                } else if (tagOrAuthorPattern.test(self.relativeUrl)) {
                    next = self.relativeUrl.slice(0, -1) + next;
                }
                head.push('<link rel="next" href="' + config.urlFor({relativeUrl: next, secure: self.secure}, true) + '" />');
            }
        }

        // Test to see if we are on a post page and that Structured data has not been disabled in config.js
        if (self.post && useStructuredData) {
            publishedDate = moment(self.post.published_at).toISOString();
            modifiedDate = moment(self.post.updated_at).toISOString();

            if (coverImage) {
                card = 'summary_large_image';
            }

            // escaped data
            metaTitle = hbs.handlebars.Utils.escapeExpression(metaTitle);
            metaDescription = hbs.handlebars.Utils.escapeExpression(metaDescription + '...');
            authorUrl = hbs.handlebars.Utils.escapeExpression(blog.url + '/author/' + self.post.author.slug);

            schema = {
                '@context': 'http://schema.org',
                '@type': 'Article',
                publisher: title,
                author: {
                    '@type': 'Person',
                    name: self.post.author.name,
                    image: authorImage,
                    url: authorUrl,
                    sameAs: self.post.author.website
                },
                headline: metaTitle,
                url: url,
                datePublished: publishedDate,
                dateModified: modifiedDate,
                image: coverImage,
                keywords: keywords,
                description: metaDescription
            };

            structuredData = {
                'og:site_name': title,
                'og:type': 'article',
                'og:title': metaTitle,
                'og:description': metaDescription,
                'og:url': url,
                'og:image': coverImage,
                'article:published_time': publishedDate,
                'article:modified_time': modifiedDate,
                'article:tag': tags,
                'twitter:card': card,
                'twitter:title': metaTitle,
                'twitter:description': metaDescription,
                'twitter:url': url,
                'twitter:image:src': coverImage
            };
            head.push('');
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
            head.push('');
            head.push('<script type="application/ld+json">\n' + JSON.stringify(schema, null, '    ') + '\n    </script>\n');
        }

        head.push('<meta name="generator" content="Ghost ' + trimmedVersion + '" />');
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
