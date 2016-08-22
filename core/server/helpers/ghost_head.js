// # Ghost Head Helper
// Usage: `{{ghost_head}}`
//
// Outputs scripts and other assets at the top of a Ghost theme
//
// We use the name ghost_head to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var getMetaData = require('../data/meta'),
    hbs = require('express-hbs'),
    escapeExpression = hbs.handlebars.Utils.escapeExpression,
    SafeString = hbs.handlebars.SafeString,
    _ = require('lodash'),
    filters = require('../filters'),
    assetHelper = require('./asset'),
    config = require('../config'),
    Promise = require('bluebird'),
    labs = require('../utils/labs'),
    api = require('../api');

function getClient() {
    if (labs.isSet('publicAPI') === true) {
        return api.clients.read({slug: 'ghost-frontend'}).then(function (client) {
            client = client.clients[0];
            if (client.status === 'enabled') {
                return {
                    id: client.slug,
                    secret: client.secret
                };
            }
            return {};
        });
    }
    return Promise.resolve({});
}

function writeMetaTag(property, content, type) {
    type = type || property.substring(0, 7) === 'twitter' ? 'name' : 'property';
    return '<meta ' + type + '="' + property + '" content="' + content + '" />';
}

function finaliseStructuredData(metaData) {
    var head = [];
    _.each(metaData.structuredData, function (content, property) {
        if (property === 'article:tag') {
            _.each(metaData.keywords, function (keyword) {
                if (keyword !== '') {
                    keyword = escapeExpression(keyword);
                    head.push(writeMetaTag(property,
                        escapeExpression(keyword)));
                }
            });
            head.push('');
        } else if (content !== null && content !== undefined) {
            head.push(writeMetaTag(property,
                escapeExpression(content)));
        }
    });
    return head;
}

function getAjaxHelper(clientId, clientSecret) {
    return '<script type="text/javascript" src="' +
        assetHelper('shared/ghost-url.js', {hash: {minifyInProduction: true}}) + '"></script>\n' +
        '<script type="text/javascript">\n' +
        'ghost.init({\n' +
        '\tclientId: "' + clientId + '",\n' +
        '\tclientSecret: "' + clientSecret + '"\n' +
        '});\n' +
        '</script>';
}

function ghost_head(options) {
    // if error page do nothing
    if (this.statusCode >= 400) {
        return;
    }

    var metaData,
        client,
        head = [],
        context = this.context ? this.context : null,
        useStructuredData = !config.isPrivacyDisabled('useStructuredData'),
        safeVersion = this.safeVersion,
        referrerPolicy = config.referrerPolicy ? config.referrerPolicy : 'no-referrer-when-downgrade',
        fetch = {
            metaData: getMetaData(this, options.data.root),
            client: getClient()
        };

    return Promise.props(fetch).then(function (response) {
        client = response.client;
        metaData = response.metaData;

        if (context) {
            // head is our main array that holds our meta data
            head.push('<link rel="canonical" href="' +
                escapeExpression(metaData.canonicalUrl) + '" />');
            head.push('<meta name="referrer" content="' + referrerPolicy + '" />');

            if (_.includes(context, 'post') && !_.includes(context, 'amp')) {
                head.push('<link rel="amphtml" href="' +
                    escapeExpression(metaData.ampUrl) + '" />');
            }

            if (metaData.previousUrl) {
                head.push('<link rel="prev" href="' +
                    escapeExpression(metaData.previousUrl) + '" />');
            }

            if (metaData.nextUrl) {
                head.push('<link rel="next" href="' +
                    escapeExpression(metaData.nextUrl) + '" />');
            }

            if (!_.includes(context, 'paged') && useStructuredData) {
                head.push('');
                head.push.apply(head, finaliseStructuredData(metaData));
                head.push('');

                if (metaData.schema) {
                    head.push('<script type="application/ld+json">\n' +
                        JSON.stringify(metaData.schema, null, '    ') +
                        '\n    </script>\n');
                }
            }

            if (client && client.id && client.secret && !_.includes(context, 'amp')) {
                head.push(getAjaxHelper(client.id, client.secret));
            }
        }

        head.push('<meta name="generator" content="Ghost ' +
            escapeExpression(safeVersion) + '" />');
        head.push('<link rel="alternate" type="application/rss+xml" title="' +
            escapeExpression(metaData.blog.title)  + '" href="' +
            escapeExpression(metaData.rssUrl) + '" />');

        return api.settings.read({key: 'ghost_head'});
    }).then(function (response) {
        // no code injection for amp context!!!
        if (!_.includes(context, 'amp')) {
            head.push(response.settings[0].value);
        }
        return filters.doFilter('ghost_head', head);
    }).then(function (head) {
        return new SafeString(head.join('\n    ').trim());
    });
}

module.exports = ghost_head;
