var _           = require('underscore'),
    api         = require('../api'),
    helpers     = require('../helpers'),
    filters     = require('../filters');

var proxy = {

    filters: {
        register: filters.registerFilter,
        unregister: filters.unregisterFilter
    },
    helpers: {
        register: helpers.registerThemeHelper,
        registerAsync: helpers.registerAsyncThemeHelper
    },
    api: {
        posts: _.pick(api.posts, 'browse', 'read'),
        tags: api.tags,
        notifications: _.pick(api.notifications, 'add'),
        settings: _.pick(api.settings, 'read')
    }
};

module.exports = proxy;