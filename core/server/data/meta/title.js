var _ = require('lodash'),
    settingsCache = require('../../services/settings/cache');

function getTitle(data, root, options) {
    var title = '',
        context = root ? root.context : null,
        postSdTitle,
        blogTitle = settingsCache.get('title'),
        pagination = root ? root.pagination : null,
        pageString = '';

    options = options ? options : {};

    if (pagination && pagination.total > 1) {
        pageString = _.has(options.hash, 'page') ? options.hash.page.replace('%', pagination.page) : ' (Page ' + pagination.page + ')';
    }

    // If there's a specific meta title
    if (data.meta_title) {
        title = data.meta_title;
    // Home title
    } else if (_.includes(context, 'home')) {
        title = blogTitle;
    // Author title, paged
    } else if (_.includes(context, 'author') && data.author && _.includes(context, 'paged')) {
        title = data.author.name + ' - ' + blogTitle + pageString;
    // Author title, index
    } else if (_.includes(context, 'author') && data.author) {
        title = data.author.name + ' - ' + blogTitle;
    // Tag title, paged
    } else if (_.includes(context, 'tag') && data.tag && _.includes(context, 'paged')) {
        title = data.tag.meta_title || data.tag.name + ' - ' + blogTitle + pageString;
    // Tag title, index
    } else if (_.includes(context, 'tag') && data.tag) {
        title = data.tag.meta_title || data.tag.name + ' - ' + blogTitle;
    // Post title
    } else if (_.includes(context, 'post') && data.post) {
        if (options && options.property) {
            postSdTitle = options.property + '_title';
            title = data.post[postSdTitle] || '';
        } else {
            title = data.post.meta_title || data.post.title;
        }
    // Page title v0.1
    } else if (_.includes(context, 'page') && data.post) {
        if (options && options.property) {
            postSdTitle = options.property + '_title';
            title = data.post[postSdTitle] || '';
        } else {
            title = data.post.meta_title || data.post.title;
        }
    // Page title v2
    } else if (_.includes(context, 'page') && data.page) {
        if (options && options.property) {
            postSdTitle = options.property + '_title';
            title = data.page[postSdTitle] || '';
        } else {
            title = data.page.meta_title || data.page.title;
        }
    // Fallback
    } else {
        title = blogTitle + pageString;
    }

    return (title || '').trim();
}

module.exports = getTitle;
