// # Ghost Head Helper
// Usage: `{{ghost_head}}`
//
// Outputs scripts and other assets at the top of a Ghost theme
const {metaData, escapeExpression, SafeString, logging, settingsCache, config, blogIcon, labs, urlUtils} = require('../services/proxy');
const _ = require('lodash');
const debug = require('ghost-ignition').debug('ghost_head');

const getMetaData = metaData.get;
const getAssetUrl = metaData.getAssetUrl;

function writeMetaTag(property, content, type) {
    type = type || property.substring(0, 7) === 'twitter' ? 'name' : 'property';
    return '<meta ' + type + '="' + property + '" content="' + content + '" />';
}

function finaliseStructuredData(metaData) {
    const head = [];

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

function getMembersHelper() {
    const stripeDirectSecretKey = settingsCache.get('stripe_secret_key');
    const stripeDirectPublishableKey = settingsCache.get('stripe_publishable_key');
    const stripeConnectAccountId = settingsCache.get('stripe_connect_account_id');

    let membersHelper = `<script defer src="${getAssetUrl('public/members.js', true)}"></script>`;
    if (config.get('enableDeveloperExperiments')) {
        membersHelper = `<script defer src="https://unpkg.com/@tryghost/members-js@latest/umd/members.min.js" data-ghost="${urlUtils.getSiteUrl()}"></script>`;
    }
    if ((!!stripeDirectSecretKey && !!stripeDirectPublishableKey) || !!stripeConnectAccountId) {
        membersHelper += '<script src="https://js.stripe.com/v3/"></script>';
    }
    return membersHelper;
}

/**
 * **NOTE**
 * Express adds `_locals`, see https://github.com/expressjs/express/blob/4.15.4/lib/response.js#L962.
 * But `options.data.root.context` is available next to `root._locals.context`, because
 * Express creates a `renderOptions` object, see https://github.com/expressjs/express/blob/4.15.4/lib/application.js#L554
 * and merges all locals to the root of the object. Very confusing, because the data is available in different layers.
 *
 * Express forwards the data like this to the hbs engine:
 * {
 *   post: {},             - res.render('view', databaseResponse)
 *   context: ['post'],    - from res.locals
 *   safeVersion: '1.x',   - from res.locals
 *   _locals: {
 *     context: ['post'],
 *     safeVersion: '1.x'
 *   }
 * }
 *
 * hbs forwards the data to any hbs helper like this
 * {
 *   data: {
 *     site: {},
 *     labs: {},
 *     config: {},
 *     root: {
 *       post: {},
 *       context: ['post'],
 *       locals: {...}
 *     }
 *  }
 *
 * `site`, `labs` and `config` are the templateOptions, search for `hbs.updateTemplateOptions` in the code base.
 *  Also see how the root object gets created, https://github.com/wycats/handlebars.js/blob/v4.0.6/lib/handlebars/runtime.js#L259
 */
// We use the name ghost_head to match the helper for consistency:
module.exports = function ghost_head(options) { // eslint-disable-line camelcase
    debug('begin');

    // if server error page do nothing
    if (options.data.root.statusCode >= 500) {
        return;
    }

    const head = [];
    const dataRoot = options.data.root;
    const context = dataRoot._locals.context ? dataRoot._locals.context : null;
    const safeVersion = dataRoot._locals.safeVersion;
    const postCodeInjection = dataRoot && dataRoot.post ? dataRoot.post.codeinjection_head : null;
    const tagCodeInjection = dataRoot && dataRoot.tag ? dataRoot.tag.codeinjection_head : null;
    const globalCodeinjection = settingsCache.get('codeinjection_head');
    const useStructuredData = !config.isPrivacyDisabled('useStructuredData');
    const referrerPolicy = config.get('referrerPolicy') ? config.get('referrerPolicy') : 'no-referrer-when-downgrade';
    const favicon = blogIcon.getIconUrl();
    const iconType = blogIcon.getIconType(favicon);

    debug('preparation complete, begin fetch');

    /**
     * @TODO:
     *   - getMetaData(dataRoot, dataRoot) -> yes that looks confusing!
     *   - there is a very mixed usage of `data.context` vs. `root.context` vs `root._locals.context` vs. `this.context`
     *   - NOTE: getMetaData won't live here anymore soon, see https://github.com/TryGhost/Ghost/issues/8995
     *   - therefor we get rid of using `getMetaData(this, dataRoot)`
     *   - dataRoot has access to *ALL* locals, see function description
     *   - it should not break anything
     */
    return getMetaData(dataRoot, dataRoot)
        .then(function handleMetaData(metaData) {
            debug('end fetch');

            if (context) {
                // head is our main array that holds our meta data
                if (metaData.metaDescription && metaData.metaDescription.length > 0) {
                    head.push('<meta name="description" content="' + escapeExpression(metaData.metaDescription) + '" />');
                }

                // no output in head if a publication icon is not set
                if (settingsCache.get('icon')) {
                    head.push('<link rel="icon" href="' + favicon + '" type="image/' + iconType + '" />');
                }

                head.push('<link rel="canonical" href="' +
                    escapeExpression(metaData.canonicalUrl) + '" />');
                head.push('<meta name="referrer" content="' + referrerPolicy + '" />');

                // don't allow indexing of preview URLs!
                if (_.includes(context, 'preview')) {
                    head.push(writeMetaTag('robots', 'noindex,nofollow', 'name'));
                }

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

                if (!_.includes(context, 'amp') && labs.isSet('members')) {
                    head.push(getMembersHelper());
                }
            }

            head.push('<meta name="generator" content="Ghost ' +
                escapeExpression(safeVersion) + '" />');

            head.push('<link rel="alternate" type="application/rss+xml" title="' +
                escapeExpression(metaData.site.title) + '" href="' +
                escapeExpression(metaData.rssUrl) + '" />');

            // no code injection for amp context!!!
            if (!_.includes(context, 'amp')) {
                if (!_.isEmpty(globalCodeinjection)) {
                    head.push(globalCodeinjection);
                }

                if (!_.isEmpty(postCodeInjection)) {
                    head.push(postCodeInjection);
                }

                if (!_.isEmpty(tagCodeInjection)) {
                    head.push(tagCodeInjection);
                }
            }
            debug('end');
            return new SafeString(head.join('\n    ').trim());
        })
        .catch(function handleError(err) {
            logging.error(err);

            // Return what we have so far (currently nothing)
            return new SafeString(head.join('\n    ').trim());
        });
};
