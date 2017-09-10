// # Ghost Head Helper
// Usage: `{{ghost_head}}`
//
// Outputs scripts and other assets at the top of a Ghost theme
//
// We use the name ghost_head to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var proxy = require('./proxy'),
    _ = require('lodash'),
    debug = require('ghost-ignition').debug('ghost_head'),

    getMetaData = proxy.metaData.get,
    getAssetUrl = proxy.metaData.getAssetUrl,
    escapeExpression = proxy.escapeExpression,
    SafeString = proxy.SafeString,
    filters = proxy.filters,
    logging = proxy.logging,
    settingsCache = proxy.settingsCache,
    config = proxy.config,
    blogIconUtils = proxy.blogIcon;

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
        getAssetUrl('public/ghost-sdk.js', true) +
        '"></script>\n' +
        '<script type="text/javascript">\n' +
        'ghost.init({\n' +
        '\tclientId: "' + clientId + '",\n' +
        '\tclientSecret: "' + clientSecret + '"\n' +
        '});\n' +
        '</script>';
}

module.exports = function ghost_head(options) {
    debug('begin');

    // if server error page do nothing
    if (this.statusCode >= 500) {
        return;
    }

    var head = [],
        dataRoot = options.data.root,
        globalCodeinjection = settingsCache.get('ghost_head'),
        postCodeInjection = dataRoot && dataRoot.post ? dataRoot.post.codeinjection_head : null,
        context = dataRoot._locals.context ? dataRoot._locals.context : null,
        client = options.data.root._locals.client,
        useStructuredData = !config.isPrivacyDisabled('useStructuredData'),
        safeVersion = dataRoot._locals.safeVersion,
        referrerPolicy = config.get('referrerPolicy') ? config.get('referrerPolicy') : 'no-referrer-when-downgrade',
        favicon = blogIconUtils.getIconUrl(),
        iconType = blogIconUtils.getIconType(favicon);

    debug('preparation complete, begin fetch');
    return getMetaData(this, dataRoot)
        .then(function handleMetaData(metaData) {
            debug('end fetch');

            if (context) {
                // head is our main array that holds our meta data
                if (metaData.metaDescription && metaData.metaDescription.length > 0) {
                    head.push('<meta name="description" content="' + escapeExpression(metaData.metaDescription) + '" />');
                }

                head.push('<link rel="shortcut icon" href="' + favicon + '" type="image/' + iconType + '" />');
                head.push('<link rel="canonical" href="' +
                    escapeExpression(metaData.canonicalUrl) + '" />');
                head.push('<meta name="referrer" content="' + referrerPolicy + '" />');

                // show amp link in post when 1. we are not on the amp page and 2. amp is enabled
                if (_.includes(context, 'post') && !_.includes(context, 'amp') && settingsCache.get('amp')) {
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

            // no code injection for amp context!!!
            if (!_.includes(context, 'amp')) {
                if (!_.isEmpty(globalCodeinjection)) {
                    head.push(globalCodeinjection);
                }

                if (!_.isEmpty(postCodeInjection)) {
                    head.push(postCodeInjection);
                }
            }
            return filters.doFilter('ghost_head', head);
        })
        .then(function afterFilters(head) {
            debug('end');
            return new SafeString(head.join('\n    ').trim());
        })
        .catch(function handleError(err) {
            logging.error(err);

            // Return what we have so far (currently nothing)
            return new SafeString(head.join('\n    ').trim());
        });
};
