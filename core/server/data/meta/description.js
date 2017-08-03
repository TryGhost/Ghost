var _ = require('lodash'),
    settingsCache = require('../../settings/cache');

function getDescription(data, root, options) {
    var description = '',
        postSdDescription,
        context = root ? root.context : null,
        blogDescription = settingsCache.get('description');

    options = options ? options : {};

    // We only return meta_description if provided. Only exception is the Blog
    // description, which doesn't rely on meta_description.
    if (data.meta_description) {
        description = data.meta_description;
    } else if (_.includes(context, 'paged')) {
        description = '';
    } else if (_.includes(context, 'home')) {
        description = blogDescription;
    } else if (_.includes(context, 'author') && data.author) {
        // The usage of meta data fields for author is currently not implemented.
        // We do have meta_description and meta_title fields
        // in the users table, but there's no UI to populate those.
        description = data.author.meta_description || '';
    } else if (_.includes(context, 'tag') && data.tag) {
        description = data.tag.meta_description || '';
    } else if ((_.includes(context, 'post') || _.includes(context, 'page')) && data.post) {
        if (options && options.property) {
            postSdDescription = options.property + '_description';
            description = data.post[postSdDescription] || '';
        } else {
            description = data.post.meta_description || '';
        }
    }

    return (description || '').trim();
}

module.exports = getDescription;
