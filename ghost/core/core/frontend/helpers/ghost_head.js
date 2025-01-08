// # Ghost Head Helper
// Usage: `{{ghost_head}}`
//
// Outputs scripts and other assets at the top of a Ghost theme
const {labs, metaData, settingsCache, config, blogIcon, urlUtils, getFrontendKey} = require('../services/proxy');
const {escapeExpression, SafeString} = require('../services/handlebars');
const {generateCustomFontCss, isValidCustomFont, isValidCustomHeadingFont} = require('@tryghost/custom-fonts');
// BAD REQUIRE
// @TODO fix this require
const {cardAssets} = require('../services/assets-minification');

const logging = require('@tryghost/logging');
const _ = require('lodash');
const debug = require('@tryghost/debug')('ghost_head');
const templateStyles = require('./tpl/styles');
const {getFrontendAppConfig, getDataAttributes} = require('../utils/frontend-apps');

/**
 * @typedef {import('@tryghost/custom-fonts').FontSelection} FontSelection
 */

const {get: getMetaData, getAssetUrl} = metaData;

function writeMetaTag(property, content, type) {
    type = type || property.substring(0, 7) === 'twitter' ? 'name' : 'property';
    return '<meta ' + type + '="' + property + '" content="' + content + '">';
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

function getMembersHelper(data, frontendKey, excludeList) {
    // Do not load Portal if both Memberships and Tips & Donations and Recommendations are disabled
    if (!settingsCache.get('members_enabled') && !settingsCache.get('donations_enabled') && !settingsCache.get('recommendations_enabled')) {
        return '';
    }
    let membersHelper = '';
    if (!excludeList.has('portal')) {
        const {scriptUrl} = getFrontendAppConfig('portal');

        const colorString = (_.has(data, 'site._preview') && data.site.accent_color) ? data.site.accent_color : '';
        const attributes = {
            i18n: labs.isSet('i18n'),
            ghost: urlUtils.getSiteUrl(),
            key: frontendKey,
            api: urlUtils.urlFor('api', {type: 'content'}, true),
            locale: settingsCache.get('locale') || 'en'
        };
        if (colorString) {
            attributes['accent-color'] = colorString;
        }
        const dataAttributes = getDataAttributes(attributes);
        membersHelper += `<script defer src="${scriptUrl}" ${dataAttributes} crossorigin="anonymous"></script>`;
    }
    if (!excludeList.has('cta_styles')) {
        membersHelper += (`<style id="gh-members-styles">${templateStyles}</style>`);
    }
    if (settingsCache.get('paid_members_enabled')) {
        // disable fraud detection for e2e tests to reduce waiting time
        const isFraudSignalsEnabled = process.env.NODE_ENV === 'testing-browser' ? '?advancedFraudSignals=false' : '';

        membersHelper += `<script async src="https://js.stripe.com/v3/${isFraudSignalsEnabled}"></script>`;
    }
    return membersHelper;
}

function getSearchHelper(frontendKey) {
    const adminUrl = urlUtils.getAdminUrl() || urlUtils.getSiteUrl();
    const {scriptUrl, stylesUrl} = getFrontendAppConfig('sodoSearch');

    if (!scriptUrl) {
        return '';
    }

    const attrs = {
        key: frontendKey,
        styles: stylesUrl,
        'sodo-search': adminUrl,
        locale: labs.isSet('i18n') ? (settingsCache.get('locale') || 'en') : undefined
    };
    const dataAttrs = getDataAttributes(attrs);
    let helper = `<script defer src="${scriptUrl}" ${dataAttrs} crossorigin="anonymous"></script>`;

    return helper;
}

function getAnnouncementBarHelper(data) {
    const preview = data?.site?._preview;
    const isFilled = settingsCache.get('announcement_content') && settingsCache.get('announcement_visibility').length;

    if (!isFilled && !preview) {
        return '';
    }

    const {scriptUrl} = getFrontendAppConfig('announcementBar');
    const siteUrl = urlUtils.getSiteUrl();
    const announcementUrl = new URL('members/api/announcement/', siteUrl);
    const attrs = {
        'announcement-bar': siteUrl,
        'api-url': announcementUrl
    };

    if (preview) {
        const searchParam = new URLSearchParams(preview);
        const announcement = searchParam.get('announcement');
        const announcementBackground = searchParam.has('announcement_bg') ? searchParam.get('announcement_bg') : '';
        const announcementVisibility = searchParam.has('announcement_vis');

        if (!announcement || !announcementVisibility) {
            return;
        }
        attrs.announcement = escapeExpression(announcement);
        attrs['announcement-background'] = escapeExpression(announcementBackground);
        attrs.preview = true;
    }

    const dataAttrs = getDataAttributes(attrs);
    let helper = `<script defer src="${scriptUrl}" ${dataAttrs} crossorigin="anonymous"></script>`;

    return helper;
}

function getWebmentionDiscoveryLink() {
    try {
        const siteUrl = urlUtils.getSiteUrl();
        const webmentionUrl = new URL('webmentions/receive/', siteUrl);
        return `<link href="${webmentionUrl.href}" rel="webmention">`;
    } catch (err) {
        logging.warn(err);
        return '';
    }
}

function getTinybirdTrackerScript(dataRoot) {
    const scriptUrl = config.get('tinybird:tracker:scriptUrl');
    const endpoint = config.get('tinybird:tracker:endpoint');
    const token = config.get('tinybird:tracker:token');

    const tbParams = _.map({
        site_uuid: config.get('tinybird:tracker:id'),
        post_uuid: dataRoot.post?.uuid,
        member_uuid: dataRoot.member?.uuid,
        member_status: dataRoot.member?.status
    }, (value, key) => `tb_${key}="${value}"`).join(' ');

    return `<script defer src="${scriptUrl}" data-storage="localStorage" data-host="${endpoint}" data-token="${token}" ${tbParams}></script>`;
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
    const excludeList = new Set(options?.hash?.exclude?.split(',') || []);
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
            if (!excludeList.has('metadata')) {
                // head is our main array that holds our meta data
                if (meta.metaDescription && meta.metaDescription.length > 0) {
                    head.push('<meta name="description" content="' + escapeExpression(meta.metaDescription) + '">');
                }

                // no output in head if a publication icon is not set
                if (settingsCache.get('icon')) {
                    head.push('<link rel="icon" href="' + favicon + '" type="image/' + iconType + '">');
                }

                head.push('<link rel="canonical" href="' + escapeExpression(meta.canonicalUrl) + '">');

                if (_.includes(context, 'preview')) {
                    head.push(writeMetaTag('robots', 'noindex,nofollow', 'name'));
                    head.push(writeMetaTag('referrer', 'same-origin', 'name'));
                } else {
                    head.push(writeMetaTag('referrer', referrerPolicy, 'name'));
                }
            }
            // show amp link in post when 1. we are not on the amp page and 2. amp is enabled
            if (_.includes(context, 'post') && !_.includes(context, 'amp') && settingsCache.get('amp')) {
                head.push('<link rel="amphtml" href="' +
                    escapeExpression(meta.ampUrl) + '">');
            }

            if (meta.previousUrl) {
                head.push('<link rel="prev" href="' +
                    escapeExpression(meta.previousUrl) + '">');
            }

            if (meta.nextUrl) {
                head.push('<link rel="next" href="' +
                    escapeExpression(meta.nextUrl) + '">');
            }

            if (!_.includes(context, 'paged') && useStructuredData) {
                if (!excludeList.has('social_data')) {
                    head.push('');
                    head.push.apply(head, finaliseStructuredData(meta));
                    head.push('');
                }

                if (!excludeList.has('schema') && meta.schema) {
                    head.push('<script type="application/ld+json">\n' +
                        JSON.stringify(meta.schema, null, '    ') +
                        '\n    </script>\n');
                }
            }
        }
        head.push('<meta name="generator" content="Ghost ' +
            escapeExpression(safeVersion) + '">');
        head.push('<link rel="alternate" type="application/rss+xml" title="' +
            escapeExpression(meta.site.title) + '" href="' +
            escapeExpression(meta.rssUrl) + '">');
        // no code injection for amp context!!!
        if (!_.includes(context, 'amp')) {
            head.push(getMembersHelper(options.data, frontendKey, excludeList)); // controlling for excludes within the function
            if (!excludeList.has('search')) {
                head.push(getSearchHelper(frontendKey));
            }
            if (!excludeList.has('announcement')) {
                head.push(getAnnouncementBarHelper(options.data));
            }
            try {
                head.push(getWebmentionDiscoveryLink());
            } catch (err) {
                logging.warn(err);
            }

            // @TODO do this in a more "frameworky" way

            if (!excludeList.has('card_assets')) {
                if (cardAssets.hasFile('js')) {
                    head.push(`<script defer src="${getAssetUrl('public/cards.min.js')}"></script>`);
                }
                if (cardAssets.hasFile('css')) {
                    head.push(`<link rel="stylesheet" type="text/css" href="${getAssetUrl('public/cards.min.css')}">`);
                }
            }

            if (!excludeList.has('comment_counts') && settingsCache.get('comments_enabled') !== 'off') {
                head.push(`<script defer src="${getAssetUrl('public/comment-counts.min.js')}" data-ghost-comments-counts-api="${urlUtils.getSiteUrl(true)}members/api/comments/counts/"></script>`);
            }

            if (settingsCache.get('members_enabled') && settingsCache.get('members_track_sources')) {
                head.push(`<script defer src="${getAssetUrl('public/member-attribution.min.js')}"></script>`);
            }

            if (options.data.site.accent_color) {
                const accentColor = escapeExpression(options.data.site.accent_color);
                const styleTag = `<style>:root {--ghost-accent-color: ${accentColor};}</style>`;
                const existingScriptIndex = _.findLastIndex(head, str => str.match(/<\/(style|script)>/));

                if (existingScriptIndex !== -1) {
                    head[existingScriptIndex] = head[existingScriptIndex] + styleTag;
                } else {
                    head.push(styleTag);
                }
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

            if (config.get('tinybird') && config.get('tinybird:tracker') && config.get('tinybird:tracker:scriptUrl')) {
                head.push(getTinybirdTrackerScript(dataRoot));
            }

            // Check if if the request is for a site preview, in which case we **always** use the custom font values
            // from the passed in data, even when they're empty strings or settings cache has values.
            const isSitePreview = options.data?.site?._preview ?? false;
            // Taking the fonts straight from the passed in data, as they can't be used from the
            // settings cache for the theme preview until the settings are saved. Once saved,
            // we need to use the settings cache to provide the correct CSS injection.
            const headingFont = isSitePreview ? options.data?.site?.heading_font : settingsCache.get('heading_font');
            const bodyFont = isSitePreview ? options.data?.site?.body_font : settingsCache.get('body_font');
            if ((typeof headingFont === 'string' && isValidCustomHeadingFont(headingFont)) ||
                (typeof bodyFont === 'string' && isValidCustomFont(bodyFont))) {
                /** @type FontSelection */
                const fontSelection = {};

                if (headingFont) {
                    fontSelection.heading = headingFont;
                }
                if (bodyFont) {
                    fontSelection.body = bodyFont;
                }
                const customCSS = generateCustomFontCss(fontSelection);
                head.push(new SafeString(customCSS));
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
