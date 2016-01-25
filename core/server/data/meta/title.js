var _ = require('lodash'),
    config = require('../../config');

function getTitle(data, root) {
    var title = '',
        context = root ? root.context : null,
        blog = config.theme,
        pagination = root ? root.pagination : null,
        pageString = '';

    if (pagination && pagination.total > 1) {
        pageString = ' - Page ' + pagination.page;
    }
    if (data.meta_title) {
        title = data.meta_title;
    } else if (_.contains(context, 'home')) {
        title = blog.title;
    } else if (_.contains(context, 'author') && data.author) {
        title = data.author.name + pageString + ' - ' + blog.title;
    } else if (_.contains(context, 'tag') && data.tag) {
        title = data.tag.meta_title || data.tag.name + pageString + ' - ' + blog.title;
    } else if ((_.contains(context, 'post') || _.contains(context, 'page')) && data.post) {
        title = data.post.meta_title || data.post.title;
    } else {
        title = blog.title + pageString;
    }

    return (title || '').trim();
}

module.exports = getTitle;
