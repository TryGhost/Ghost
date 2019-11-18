const _ = require('lodash');
const settingsCache = require('../../server/services/settings/cache');

function getDescription(data, root, options) {
    const context = root ? root.context : null;
    const siteDescription = settingsCache.get('meta_description') || settingsCache.get('description');

    let description = '';
    let postSdDescription;

    options = options ? options : {};

    // We only return meta_description if provided
    if (data.meta_description) {
        description = data.meta_description;
    } else if (_.includes(context, 'paged')) {
        description = '';
    } else if (_.includes(context, 'home')) {
        if (options && options.property) {
            const siteSdDescription = options.property + '_description';
            description = settingsCache.get(siteSdDescription) || '';
        } else {
            description = siteDescription;
        }
    } else if (_.includes(context, 'author') && data.author) {
        // The usage of meta data fields for author is currently not implemented.
        // We do have meta_description and meta_title fields
        // in the users table, but there's no UI to populate those.
        description = data.author.meta_description || '';
    } else if (_.includes(context, 'tag') && data.tag) {
        description = data.tag.meta_description || '';
    } else if (_.includes(context, 'post') && data.post) {
        if (options && options.property) {
            postSdDescription = options.property + '_description';
            description = data.post[postSdDescription] || '';
        } else {
            description = data.post.meta_description || '';
        }
    } else if (_.includes(context, 'page') && data.post) {
        // Page title dependent on legacy object formatting (https://github.com/TryGhost/Ghost/issues/10042)
        if (options && options.property) {
            postSdDescription = options.property + '_description';
            description = data.post[postSdDescription] || '';
        } else {
            description = data.post.meta_description || '';
        }
    } else if (_.includes(context, 'page') && data.page) {
        if (options && options.property) {
            postSdDescription = options.property + '_description';
            description = data.page[postSdDescription] || '';
        } else {
            description = data.page.meta_description || '';
        }
    }

    return (description || '').trim();
}

module.exports = getDescription;
