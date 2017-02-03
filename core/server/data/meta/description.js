var _ = require('lodash'),
    settingsCache = require('../../api/settings').cache;

function getDescription(data, root) {
    var description = '',
        context = root ? root.context : null,
        blogDescription = settingsCache.get('description');

    if (data.meta_description) {
        description = data.meta_description;
    } else if (_.includes(context, 'paged')) {
        description = '';
    } else if (_.includes(context, 'home')) {
        description = blogDescription;
    } else if (_.includes(context, 'author') && data.author) {
        description = data.author.meta_description || data.author.bio;
    } else if (_.includes(context, 'tag') && data.tag) {
        description = data.tag.meta_description || data.tag.description;
    } else if ((_.includes(context, 'post') || _.includes(context, 'page')) && data.post) {
        description = data.post.meta_description;
    }

    return (description || '').trim();
}

module.exports = getDescription;
