// # Ghost Head Helper
// Usage: `{{ghost_head}}`
//
// Outputs scripts and other assets at the top of a Ghost theme
const {metaData, settingsCache, config, blogIcon, urlUtils, labs, getFrontendKey} = require('../services/proxy');
const {escapeExpression, SafeString} = require('../services/handlebars');

// BAD REQUIRE
// @TODO fix this require
const cardAssetService = require('../services/card-assets');

const logging = require('@tryghost/logging');
const _ = require('lodash');
const debug = require('@tryghost/debug')('ghost_head');
const templateStyles = require('./tpl/styles');

const {get: getMetaData, getAssetUrl} = metaData;

function writeMetaTag(property, content, type) {
    type = type || property.substring(0, 7) === 'twitter' ? 'name' : 'property';
    return '<meta ' + type + '="' + property + '" content="' + content + '" />';
}

function finaliseStructuredData(meta) {
    const head = [];

    _.each(meta.structuredData, function (content, property) {
        if (property === 'article:tag') {
            _.each(meta.keywords, function (keyword) {
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

function getMembersHelper(data, frontendKey) {
    if (!settingsCache.get('members_enabled')) {
        return '';
    }

    const colorString = _.has(data, 'site._preview') && data.site.accent_color ? ` data-accent-color="${data.site.accent_color}"` : '';
    let membersHelper = `<script defer src="${config.get('portal:url')}" data-ghost="${urlUtils.getSiteUrl()}"${colorString} data-key="${frontendKey}" data-api="${urlUtils.urlFor('api', {type: 'content'}, true)}" crossorigin="anonymous"></script>`;
    membersHelper += (`<style id="gh-members-styles">${templateStyles}</style>`);
    if (settingsCache.get('paid_members_enabled')) {
        membersHelper += '<script async src="https://js.stripe.com/v3/"></script>';
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
module.exports = async function ghost_head(options) { // eslint-disable-line camelcase
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

    try {
        /**
         * @TODO:
         *   - getMetaData(dataRoot, dataRoot) -> yes that looks confusing!
         *   - there is a very mixed usage of `data.context` vs. `root.context` vs `root._locals.context` vs. `this.context`
         *   - NOTE: getMetaData won't live here anymore soon, see https://github.com/TryGhost/Ghost/issues/8995
         *   - therefore we get rid of using `getMetaData(this, dataRoot)`
         *   - dataRoot has access to *ALL* locals, see function description
         *   - it should not break anything
         */
        const meta = await getMetaData(dataRoot, dataRoot);
        const frontendKey = await getFrontendKey();

        debug('end fetch');

        if (context) {
            // head is our main array that holds our meta data
            if (meta.metaDescription && meta.metaDescription.length > 0) {
                head.push('<meta name="description" content="' + escapeExpression(meta.metaDescription) + '" />');
            }

            // no output in head if a publication icon is not set
            if (settingsCache.get('icon')) {
                head.push('<link rel="icon" href="' + favicon + '" type="image/' + iconType + '" />');
            }

            head.push('<link rel="canonical" href="' + escapeExpression(meta.canonicalUrl) + '" />');
            head.push('<meta name="referrer" content="' + referrerPolicy + '" />');

            // don't allow indexing of preview URLs!
            if (_.includes(context, 'preview')) {
                head.push(writeMetaTag('robots', 'noindex,nofollow', 'name'));
            }

            // show amp link in post when 1. we are not on the amp page and 2. amp is enabled
            if (_.includes(context, 'post') && !_.includes(context, 'amp') && settingsCache.get('amp')) {
                head.push('<link rel="amphtml" href="' +
                    escapeExpression(meta.ampUrl) + '" />');
            }

            if (meta.previousUrl) {
                head.push('<link rel="prev" href="' +
                    escapeExpression(meta.previousUrl) + '" />');
            }

            if (meta.nextUrl) {
                head.push('<link rel="next" href="' +
                    escapeExpression(meta.nextUrl) + '" />');
            }

            if (!_.includes(context, 'paged') && useStructuredData) {
                head.push('');
                head.push.apply(head, finaliseStructuredData(meta));
                head.push('');

                if (meta.schema) {
                    head.push('<script type="application/ld+json">\n' +
                        JSON.stringify(meta.schema, null, '    ') +
                        '\n    </script>\n');
                }
            }
        }

        head.push('<meta name="generator" content="Ghost ' +
            escapeExpression(safeVersion) + '" />');

        // Ghost analytics tag
        if (labs.isSet('membersActivity')) {
            const postId = (dataRoot && dataRoot.post) ? dataRoot.post.id : '';
            head.push(writeMetaTag('ghost-analytics-id', postId, 'name'));
        }

        head.push('<link rel="alternate" type="application/rss+xml" title="' +
            escapeExpression(meta.site.title) + '" href="' +
            escapeExpression(meta.rssUrl) + '" />');

        // no code injection for amp context!!!
        if (!_.includes(context, 'amp')) {
            head.push(getMembersHelper(options.data, frontendKey));

            // @TODO do this in a more "frameworky" way
            if (cardAssetService.hasFile('js')) {
                head.push(`<script defer src="${getAssetUrl('public/cards.min.js')}"></script>`);
            }
            if (cardAssetService.hasFile('css')) {
                head.push(`<link rel="stylesheet" type="text/css" href="${getAssetUrl('public/cards.min.css')}">`);
            }

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

        // AMP template has style injected directly because there can only be one <style amp-custom> tag
        if (options.data.site.accent_color && !_.includes(context, 'amp')) {
            const accentColor = escapeExpression(options.data.site.accent_color);
            const styleTag = `<style>:root {--ghost-accent-color: ${accentColor};}</style>`;
            const existingScriptIndex = _.findLastIndex(head, str => str.match(/<\/(style|script)>/));

            if (existingScriptIndex !== -1) {
                head[existingScriptIndex] = head[existingScriptIndex] + styleTag;
            } else {
                head.push(styleTag);
            }
        }

        debug('end');
        return new SafeString(head.join('\n    ').trim());
    } catch (error) {
        logging.error(error);

        // Return what we have so far (currently nothing)
        return new SafeString(head.join('\n    ').trim());
    }
};

module.exports.async = true;
