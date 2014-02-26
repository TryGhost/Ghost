var _           = require('lodash'),
    api         = require('../api'),
    helpers     = require('../helpers'),
    filters     = require('../filters');

var proxy = {

    filters: {
        register: filters.registerFilter.bind(filters),
        deregister: filters.deregisterFilter.bind(filters)
    },
    helpers: {
        register: helpers.registerThemeHelper.bind(helpers),
        registerAsync: helpers.registerAsyncThemeHelper.bind(helpers)
    },
    api: {
        posts: _.pick(api.posts, 'browse', 'read'),
        tags: _.pick(api.tags, 'browse'),
        notifications: _.pick(api.notifications, 'add'),
        settings: _.pick(api.settings, 'read')
    }
};

module.exports = proxy;
