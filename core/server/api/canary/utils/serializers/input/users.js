const debug = require('ghost-ignition').debug('api:canary:utils:serializers:input:users');
const url = require('./utils/url');

module.exports = {
    read(apiConfig, frame) {
        debug('read');

        if (frame.data.id === 'me' && frame.options.context && frame.options.context.user) {
            frame.data.id = frame.options.context.user;
        }
    },

    edit(apiConfig, frame) {
        debug('edit');

        if (frame.options.id === 'me' && frame.options.context && frame.options.context.user) {
            frame.options.id = frame.options.context.user;
        }

        if (frame.data.users[0].password) {
            delete frame.data.users[0].password;
        }

        frame.data.users[0] = url.forUser(Object.assign({}, frame.data.users[0]));
    }
};
