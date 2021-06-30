const _ = require('lodash');
const settingsCache = require('../../shared/settings-cache');

function getTitle(data, root, options = {}) {
    const context = root ? root.context : null;
    const siteTitle = settingsCache.get('title');
    const pagination = root ? root.pagination : null;

    // options.property = null/'og'/'twitter'
    const optionsPropertyName = `${options.property || 'meta'}_title`;

    let title = '';
    let pageString = '';

    if (pagination && pagination.total > 1) {
        pageString = _.has(options.hash, 'page') ? options.hash.page.replace('%', pagination.page) : ' (Page ' + pagination.page + ')';
    }

    // If there's a specific meta title
    if (data.meta_title) {
        title = data.meta_title;
    // Home title
    } else if (_.includes(context, 'home')) {
        if (options.property) {
            title = settingsCache.get(optionsPropertyName) || siteTitle;
        } else {
            title = settingsCache.get('meta_title') || siteTitle;
        }
    // Author title, paged
    } else if (_.includes(context, 'author') && data.author && _.includes(context, 'paged')) {
        title = data.author.name + ' - ' + siteTitle + pageString;
    // Author title, index
    } else if (_.includes(context, 'author') && data.author) {
        title = data.author.name + ' - ' + siteTitle;
    // Tag title, paged
    } else if (_.includes(context, 'tag') && data.tag && _.includes(context, 'paged')) {
        title = data.tag.meta_title || data.tag.name + ' - ' + siteTitle + pageString;
    // Tag title, index
    } else if (_.includes(context, 'tag') && data.tag) {
        title = data.tag[optionsPropertyName] || data.tag.meta_title || data.tag.name + ' - ' + siteTitle;
    // Post title
    } else if (_.includes(context, 'post') && data.post) {
        title = data.post[optionsPropertyName] || data.post.meta_title || data.post.title;
    // Page title dependent on legacy object formatting (https://github.com/TryGhost/Ghost/issues/10042)
    } else if (_.includes(context, 'page') && data.post) {
        title = data.post[optionsPropertyName] || data.post.meta_title || data.post.title;
    // Page title v2
    } else if (_.includes(context, 'page') && data.page) {
        title = data.page[optionsPropertyName] || data.page.meta_title || data.page.title;
    // Fallback
    } else {
        title = siteTitle + pageString;
    }

    return (title || '').trim();
}

module.exports = getTitle;
