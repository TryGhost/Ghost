const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:input:users');
const url = require('./utils/url');

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');

        // Staff users route through the authors router types.
        url.forceUrlColumnsWhenLazy(frame, 'authors');
    },

    read(apiConfig, frame) {
        debug('read');

        url.forceUrlColumnsWhenLazy(frame, 'authors');

        if (frame.data.id === 'me' && frame.options.context && frame.options.context.user) {
            frame.data.id = frame.options.context.user;
        }
    },

    edit(apiConfig, frame) {
        debug('edit');

        if (frame.options.id === 'me' && frame.options.context && frame.options.context.user) {
            frame.options.id = frame.options.context.user;
        }

        delete frame.data.users[0].password;
        delete frame.data.users[0].last_seen;

        frame.data.users[0] = url.forUser(Object.assign({}, frame.data.users[0]));
    }
};
