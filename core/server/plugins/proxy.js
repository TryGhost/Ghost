var _ = require('underscore');

function createProxy(ghost) {

    return {
        filters: {
            register: ghost.registerFilter,
            unregister: ghost.unregisterFilter
        },
        helpers: {
            register: ghost.registerThemeHelper,
            registerAsync: ghost.registerAsyncThemeHelper
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