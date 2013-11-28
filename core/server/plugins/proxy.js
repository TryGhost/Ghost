var _           = require('underscore'),
    helpers     = require('../helpers'),
    filters     = require('../filters');

function createProxy(ghost) {

    return {
        filters: {
            register: filters.registerFilter,
            unregister: filters.unregisterFilter
        },
        helpers: {
            register: helpers.registerThemeHelper,
            registerAsync: helpers.registerAsyncThemeHelper
        },
        api: {
            posts: _.pick(ghost.api.posts, 'browse', 'read'),
            tags: ghost.api.tags,
            notifications: _.pick(ghost.api.notifications, 'add'),
            settings: _.pick(ghost.api.settings, 'read')
        }
    };
}

module.exports = createProxy;