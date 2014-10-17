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

    urlHelper           = require('./url'),
    meta_description    = require('./meta_description'),
    meta_title          = require('./meta_title'),
    excerpt             = require('./excerpt'),
    tagsHelper          = require('./tags'),
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
        trimmedUrl, next, prev, tags,
        ops = [],
        structuredData,
        coverImage, authorImage, keywords,
        schema;

    trimmedVersion = trimmedVersion ? trimmedVersion.match(majorMinor)[0] : '?';
    // Push Async calls to an array of promises
    ops.push(urlHelper.call(self, {hash: {absolute: true}}));
    ops.push(meta_description.call(self));
    ops.push(meta_title.call(self));

    // Resolves promises then push pushes meta data into ghost_head
    return Promise.settle(ops).then(function (results) {
        var url = results[0].value(),
            metaDescription = results[1].value(),
            metaTitle = results[2].value(),
            publishedDate, modifiedDate,
            tags = tagsHelper.call(self.post, {hash: {autolink: 'false'}}).string.split(','),
            card = 'content';

        if (!metaDescription) {
            metaDescription = excerpt.call(self.post, {hash: {words: '40'}}).string;
        }
        if (tags[0] !== '') {
            keywords = tagsHelper.call(self.post, {hash: {autolink: 'false', seperator: ', '}}).string;
        }
        head.push('<link rel="canonical" href="' + url + '" />');

        if (self.pagination) {
            trimmedUrl = self.relativeUrl.match(trimmedUrlpattern);
            if (self.pagination.prev) {
                prev = (self.pagination.prev > 1 ? prev = '/page/' + self.pagination.prev + '/' : prev = '/');
                prev = (trimmedUrl) ? '/' + trimmedUrl + prev : prev;
                head.push('<link rel="prev" href="' + config.urlFor({relativeUrl: prev, secure: self.secure}, true) + '" />');
            }
            if (self.pagination.next) {
                next = '/page/' + self.pagination.next + '/';
                next = (trimmedUrl) ? '/' + trimmedUrl + next : next;
                head.push('<link rel="next" href="' + config.urlFor({relativeUrl: next, secure: self.secure}, true) + '" />');
            }
        }

        // Test to see if we are on a post page and that Structured data has not been disabled in config.js
        if (self.post && useStructuredData) {
            publishedDate = moment(self.post.published_at).toISOString();
            modifiedDate = moment(self.post.updated_at).toISOString();

            if (self.post.image) {
                coverImage = self.post.image;
                // Test to see if image was linked by url or uploaded
                coverImage = coverImage.substring(0, 4) === 'http' ? coverImage : _.escape(blog.url) + coverImage;
                card = 'summary_large_image';
            }

            if (self.post.author.image) {
                authorImage = self.post.author.image;
                // Test to see if image was linked by url or uploaded
                authorImage = authorImage.substring(0, 4) === 'http' ? authorImage : _.escape(blog.url) + authorImage;
            }

            schema = {
                '@context': 'http://schema.org',
                '@type': 'Article',
                publisher: _.escape(blog.title),
                author: {
                    '@type': 'Person',
                    name: self.post.author.name,
                    image: authorImage,
                    url: _.escape(blog.url) + '/author/' + self.post.author.slug,
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
                'og:site_name': _.escape(blog.title),
                'og:type': 'article',
                'og:title': metaTitle,
                'og:description': metaDescription + '...',
                'og:url': url,
                'og:image': coverImage,
                'article:published_time': publishedDate,
                'article:modified_time': modifiedDate,
                'article:tag': tags,
                'twitter:card': card,
                'twitter:title': metaTitle,
                'twitter:description': metaDescription + '...',
                'twitter:url': url,
                'twitter:image:src': coverImage
            };
            head.push('');
            _.each(structuredData, function (content, property) {
                if (property === 'article:tag') {
                    _.each(tags, function (tag) {
                        if (tag !== '') {
                            head.push('<meta property="' + property + '" content="' + tag.trim() + '" />');
                        }
                    });
                    head.push('');
                } else if (content !== null && content !== undefined) {
                    if (property.substring(0, 7) === 'twitter') {
                        head.push('<meta name="' + property + '" content="' + content + '" />');
                    } else {
                        head.push('<meta property="' + property + '" content="' + content + '" />');
                    }
                }
            });
            head.push('');
            head.push('<script type="application/ld+json">\n' + JSON.stringify(schema, null, '    ') + '\n    </script>\n');
        }

        head.push('<meta name="generator" content="Ghost ' + trimmedVersion + '" />');
        head.push('<link rel="alternate" type="application/rss+xml" title="' +
            _.escape(blog.title)  + '" href="' + config.urlFor('rss') + '" />');
        return filters.doFilter('ghost_head', head);
    }).then(function (head) {
        var headString = _.reduce(head, function (memo, item) { return memo + '\n    ' + item; }, '');
        return new hbs.handlebars.SafeString(headString.trim());
    });
};

module.exports = ghost_head;
