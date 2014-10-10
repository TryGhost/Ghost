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
        structuredData;

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
            publishedDate, modifiedDate;

        if (!metaDescription) {
            metaDescription = excerpt.call(self.post, {hash: {words: '40'}});
        }

        head.push('<link rel="canonical" href="' + url + '" />');

        if (self.pagination) {
            trimmedUrl = self.relativeUrl.match(trimmedUrlpattern);
            if (self.pagination.prev) {
                prev = (self.pagination.prev > 1 ? prev = '/page/' + self.pagination.prev + '/' : prev = '/');
                prev = (trimmedUrl) ? '/' + trimmedUrl + prev : prev;
                head.push('<link rel="prev" href="' + config.urlFor({relativeUrl: prev}, true) + '" />');
            }
            if (self.pagination.next) {
                next = '/page/' + self.pagination.next + '/';
                next = (trimmedUrl) ? '/' + trimmedUrl + next : next;
                head.push('<link rel="next" href="' + config.urlFor({relativeUrl: next}, true) + '" />');
            }
        }

        // Test to see if we are on a post page and that Structured data has not been disabled in config.js
        if (self.post && useStructuredData) {
            publishedDate = moment(self.post.published_at).toISOString();
            modifiedDate = moment(self.post.updated_at).toISOString();

            structuredData = {
                'og:site_name': _.escape(blog.title),
                'og:type': 'article',
                'og:title': metaTitle,
                'og:description': metaDescription + '...',
                'og:url': url,
                'article:published_time': publishedDate,
                'article:modified_time': modifiedDate
            };

            if (self.post.image)  {
                structuredData['og:image'] = _.escape(blog.url) + self.post.image;
            }

            _.each(structuredData, function (content, property) {
                head.push('<meta property="' + property + '" content="' + content + '" />');
            });

            // Calls tag helper and assigns an array of tag names for a post
            tags = tagsHelper.call(self.post, {hash: {autolink: 'false'}}).string.split(',');

            _.each(tags, function (tag) {
                if (tag !== '') {
                    head.push('<meta property="article:tag" content="' + tag.trim() + '" />');
                }
            });
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
