const {metaData, settingsCache, urlUtils} = require('../proxy');
const {escapeExpression} = require('../handlebars');
const {getDataAttributes} = require('../../utils/frontend-apps');

const {getAssetUrl} = metaData;

function getStaffFrontendHeadScripts({dataRoot, excludeList = new Set(), siteTitle}) {
    if (!dataRoot._locals?.staffFrontendToolsEnabled || excludeList.has('admin_toolbar')) {
        return [];
    }

    return [getAdminToolbarScript(dataRoot, siteTitle)];
}

function getAdminToolbarScript(dataRoot, siteTitle) {
    const src = getAssetUrl('public/admin-toolbar.min.js', false);
    const attrs = getAdminToolbarAttributes(dataRoot, siteTitle);
    const dataAttrs = getDataAttributes(attrs);

    return `<script defer src="${src}" ${dataAttrs}></script>`;
}

function getAdminToolbarAttributes(dataRoot, siteTitle) {
    const context = dataRoot._locals?.context || dataRoot.context || [];
    const entry = dataRoot.post || dataRoot.page;
    const resourceId = entry?.id;
    const resourceSlug = context.includes('tag') ? dataRoot.tag?.slug : '';
    const isHome = context.includes('home');
    let resourceType = '';

    if (resourceId) {
        resourceType = context.includes('page') || entry.type === 'page' ? 'page' : 'post';
    } else if (resourceSlug) {
        resourceType = 'tag';
    }

    return {
        'ghost-admin-toolbar': escapeExpression(urlUtils.urlFor('admin', true)),
        'site-title': escapeExpression(siteTitle || settingsCache.get('title') || 'Ghost'),
        'resource-type': resourceType || undefined,
        'resource-id': resourceId ? escapeExpression(resourceId) : undefined,
        'resource-slug': resourceSlug ? escapeExpression(resourceSlug) : undefined,
        'page-context': isHome ? 'home' : undefined,
        'site-analytics-enabled': isHome && settingsCache.get('web_analytics_enabled') === true ? 'true' : undefined,
        'activitypub-enabled': isHome && settingsCache.get('social_web_enabled') === true ? 'true' : undefined,
        'members-enabled': isHome && settingsCache.get('members_enabled') === true ? 'true' : undefined,
        'comments-enabled': resourceType === 'post' && settingsCache.get('comments_enabled') === 'off' ? 'false' : undefined
    };
}

module.exports = {
    getAdminToolbarAttributes,
    getStaffFrontendHeadScripts
};
