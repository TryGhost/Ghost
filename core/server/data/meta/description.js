var _ = require('lodash'),
    config = require('../../config');

function getDescription(data, root) {
    var description = '',
        context = root ? root.context : null;

    if (data.meta_description) {
        description = data.meta_description;
    } else if (_.contains(context, 'paged')) {
        description = '';
    } else if (_.contains(context, 'home')) {
        description = config.theme.description;
    } else if (_.contains(context, 'author') && data.author) {
        description = data.author.bio;
    } else if (_.contains(context, 'tag') && data.tag) {
        description = data.tag.meta_description;
    } else if ((_.contains(context, 'post') || _.contains(context, 'page')) && data.post) {
        description = data.post.meta_description;
    }

    return (description || '').trim();
}

module.exports = getDescription;
