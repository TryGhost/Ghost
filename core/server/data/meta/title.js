var _ = require('lodash'),
    settingsCache = require('../../settings/cache');

function getTitle(data, root, options) {
    var title = '',
        context = root ? root.context : null,
        postSdTitle,
        blogTitle = settingsCache.get('title'),
        pagination = root ? root.pagination : null,
        pageString = '';

    options = options ? options : {};

    if (pagination && pagination.total > 1) {
        pageString = ' (Page ' + pagination.page + ')';
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
    } else if ((_.includes(context, 'post') || _.includes(context, 'page')) && data.post) {
        if (options && options.property) {
            postSdTitle = options.property + '_title';
            title = data.post[postSdTitle] || '';
        } else {
            title = data.post.meta_title || data.post.title;
        }
    // Fallback
    } else {
        title = blogTitle + pageString;
    }

    return (title || '').trim();
}

module.exports = getTitle;
